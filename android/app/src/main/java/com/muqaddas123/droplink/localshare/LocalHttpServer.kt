package com.muqaddas123.droplink.localshare

import android.content.ContentResolver
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Environment
import android.util.Log
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.net.URLEncoder
import java.util.Collections
import java.util.UUID
import java.util.concurrent.Executors

data class SharedFile(
    val uri: Uri,
    val name: String,
    val mimeType: String?,
    val size: Long,
    @Volatile var downloadCount: Int = 0
)

data class ReceivedFile(
    val name: String,
    val mimeType: String,
    val size: Long,
    val path: String,
    val category: String
)

class LocalHttpServer(
    private val contentResolver: ContentResolver,
    private val context: Context,
    private val senderName: String
) {
    companion object {
        private const val TAG = "DropLink"
        private const val INVALID_RANGE = -1L
    }

    private var serverSocket: ServerSocket? = null
    private val sharedFiles = Collections.synchronizedList(mutableListOf<SharedFile>())
    private val receivedFiles = Collections.synchronizedList(mutableListOf<ReceivedFile>())
    private val executor = Executors.newFixedThreadPool(8)
    @Volatile private var running = false

    data class SharedText(
        val id: String,
        val text: String,
        val timestamp: Long,
        val sender: String
    )

    private val sharedTexts = Collections.synchronizedList(mutableListOf<SharedText>())
    var onTextReceived: ((text: String) -> Unit)? = null
    var onTransferProgress: ((bytes: Long, total: Long, speed: Long, fileName: String, isUpload: Boolean) -> Unit)? = null

    fun addSharedText(text: String, sender: String = "device") {
        if (text.isBlank()) return
        val item = SharedText(
            id = UUID.randomUUID().toString(),
            text = text,
            timestamp = System.currentTimeMillis(),
            sender = sender
        )
        synchronized(sharedTexts) {
            sharedTexts.add(0, item)
            if (sharedTexts.size > 50) sharedTexts.removeAt(sharedTexts.size - 1)
        }
    }

    fun getSharedTexts(): List<SharedText> {
        synchronized(sharedTexts) {
            return sharedTexts.toList()
        }
    }

    fun start(port: Int): Int {
        if (running) return getPort()
        val socket = ServerSocket(port)
        serverSocket = socket
        running = true
        scanReceivedFiles()

        executor.execute {
            while (running && !socket.isClosed) {
                try {
                    val client = socket.accept()
                    client.soTimeout = 30000
                    executor.execute { handleClient(client) }
                } catch (e: Exception) {
                    if (running) Log.w(TAG, "Server accept error", e)
                }
            }
        }
        return socket.localPort
    }

    fun stop() {
        running = false
        try { serverSocket?.close() } catch (_: Exception) {}
        serverSocket = null
    }

    fun isRunning(): Boolean = running && serverSocket?.isClosed == false

    fun getPort(): Int = serverSocket?.localPort ?: -1

    fun setFiles(files: List<SharedFile>) {
        synchronized(sharedFiles) {
            sharedFiles.clear()
            sharedFiles.addAll(files)
        }
    }

    fun addFiles(files: List<SharedFile>) {
        synchronized(sharedFiles) {
            sharedFiles.addAll(files)
        }
    }

    fun getSharedFiles(): List<SharedFile> {
        synchronized(sharedFiles) {
            return sharedFiles.toList()
        }
    }

    fun getReceivedFiles(): List<ReceivedFile> {
        synchronized(receivedFiles) {
            return receivedFiles.toList()
        }
    }

    fun scanReceivedFiles(): List<ReceivedFile> {
        val list = mutableListOf<ReceivedFile>()
        val root = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "DropLink")
        if (root.exists() && root.isDirectory) {
            root.walkTopDown().filter { it.isFile }.forEach { f ->
                val cat = f.parentFile?.name ?: "Others"
                list.add(ReceivedFile(
                    name = f.name,
                    mimeType = "application/octet-stream",
                    size = f.length(),
                    path = f.absolutePath,
                    category = cat
                ))
            }
        }
        synchronized(receivedFiles) {
            receivedFiles.clear()
            receivedFiles.addAll(list.reversed())
        }
        return list
    }

    private fun handleClient(socket: Socket) {
        try {
            socket.use { s ->
                val input = BufferedInputStream(s.getInputStream(), 64 * 1024)
                val output = BufferedOutputStream(s.getOutputStream(), 64 * 1024)
                val request = readRequestHeaders(input) ?: return

                val firstLine = request.substringBefore("\r\n")
                val parts = firstLine.split(" ")
                if (parts.size < 2) {
                    sendText(output, "400 Bad Request", "Malformed request line")
                    return
                }

                val method = parts[0].uppercase()
                val rawPath = parts[1].substringBefore("?")
                val decodedPath = try { URLDecoder.decode(rawPath, "UTF-8") } catch (_: Exception) { rawPath }

                when {
                    method == "GET" && decodedPath == "/" -> sendIndexPage(output)
                    method == "GET" && decodedPath == "/shared" -> sendSharedFilesJson(output)
                    method == "GET" && decodedPath == "/received" -> sendReceivedFilesJson(output)
                    method == "GET" && decodedPath == "/text" -> sendSharedTextsJson(output)
                    method == "POST" && decodedPath == "/text" -> handleSharedTextPost(input, output, request)
                    method == "GET" && decodedPath.startsWith("/download/") -> sendFile(output, decodedPath, request, isPreview = false)
                    method == "GET" && decodedPath.startsWith("/preview/") -> sendFile(output, decodedPath.replaceFirst("/preview/", "/download/"), request, isPreview = true)
                    method == "POST" && decodedPath == "/upload" -> handleUpload(input, output, request)
                    else -> sendText(output, "404 Not Found", "Not Found")
                }
            }
        } catch (e: Exception) {
            if (running) Log.e(TAG, "Client handling error", e)
        }
    }

    private fun readRequestHeaders(input: BufferedInputStream): String? {
        val builder = StringBuilder()
        var lastFour = 0
        while (true) {
            val b = input.read()
            if (b == -1) return null
            builder.append(b.toChar())
            lastFour = (lastFour shl 8) or (b and 0xFF)
            if (lastFour == 0x0D0A0D0A) break
            if (builder.length > 32 * 1024) return null
        }
        return builder.toString()
    }

    private fun getHeader(request: String, name: String): String? {
        val target = name.lowercase()
        return request.split("\r\n").drop(1).firstOrNull {
            it.substringBefore(":").trim().lowercase() == target
        }?.substringAfter(":", "")?.trim()
    }

    private fun sendIndexPage(output: BufferedOutputStream) {
        val files = getSharedFiles()
        val html = buildString {
            append("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DropLink - Fast Local Share</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #0f172a;
    color: #f8fafc;
}
.container { max-width: 760px; margin: auto; }
.header {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    padding: 24px;
    border-radius: 20px;
    margin-bottom: 20px;
    box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);
}
.header h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
.header p { margin-top: 6px; opacity: .9; font-size: 13px; }
.card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 18px;
    padding: 20px;
    margin-bottom: 18px;
    box-shadow: 0 4px 14px rgba(0,0,0,.2);
}
.card-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 14px;
    color: #f1f5f9;
    display: flex;
    align-items: center;
    gap: 8px;
}
.drop-zone {
    border: 2px dashed #475569;
    border-radius: 14px;
    padding: 24px 16px;
    text-align: center;
    background: #0f172a;
    cursor: pointer;
    transition: all .2s;
}
.drop-zone.dragover { border-color: #38bdf8; background: rgba(56, 189, 248, 0.1); }
.drop-zone-icon { font-size: 32px; margin-bottom: 8px; }
.drop-zone-text { font-size: 14px; color: #94a3b8; font-weight: 500; }
.btn-row { display: flex; gap: 10px; margin-top: 14px; }
.btn-select {
    flex: 1;
    background: #334155;
    color: #f8fafc;
    border: 1px solid #475569;
    padding: 10px 14px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    text-align: center;
}
.btn-select:hover { background: #475569; }
.upload-btn {
    width: 100%;
    margin-top: 12px;
    padding: 13px;
    border: none;
    border-radius: 12px;
    background: #10b981;
    color: white;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    transition: background .2s;
}
.upload-btn:hover { background: #059669; }
.upload-btn:disabled { opacity: .5; cursor: not-allowed; }
.status {
    margin-top: 14px;
    padding: 12px;
    border-radius: 10px;
    background: #0f172a;
    border: 1px solid #334155;
    font-size: 13px;
    color: #cbd5e1;
}
.progress {
    width: 100%;
    height: 8px;
    margin-top: 10px;
    border-radius: 6px;
    background: #334155;
    overflow: hidden;
}
.progress-bar { height: 100%; width: 0%; background: #10b981; transition: width .15s; }
.file {
    padding: 14px;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}
.file:last-child { border-bottom: none; }
.file-info { flex: 1; min-width: 0; }
.file-name { font-weight: 600; font-size: 14px; word-break: break-all; color: #f8fafc; }
.file-size { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.file-actions { display: flex; gap: 8px; }
.download {
    padding: 8px 14px;
    border-radius: 10px;
    background: #2563eb;
    color: white;
    text-decoration: none;
    font-weight: 600;
    font-size: 12px;
    border: none;
    cursor: pointer;
}
.download:hover { background: #1d4ed8; }
.preview-btn {
    padding: 8px 14px;
    border-radius: 10px;
    background: #475569;
    color: white;
    text-decoration: none;
    font-weight: 600;
    font-size: 12px;
    border: none;
    cursor: pointer;
}
.preview-btn:hover { background: #64748b; }
.download-all {
    width: 100%;
    margin-bottom: 14px;
    padding: 12px;
    border: none;
    border-radius: 12px;
    background: #3b82f6;
    color: white;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
}
.download-all:disabled { opacity: .5; cursor: wait; }
.download-status { display: none; margin-bottom: 14px; }
.text-box {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 12px;
}
.text-content {
    font-family: monospace;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #e2e8f0;
    margin-bottom: 8px;
}
.copy-btn {
    background: #334155;
    border: 1px solid #475569;
    color: #cbd5e1;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}
.copy-btn:hover { background: #475569; }
.text-input {
    width: 100%;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 10px;
    color: #f8fafc;
    font-family: inherit;
    font-size: 13px;
    resize: vertical;
}
.text-input:focus { outline: none; border-color: #3b82f6; }
.modal-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.85);
    z-index: 9999;
    justify-content: center;
    align-items: center;
    padding: 16px;
}
.modal-content {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 20px;
    max-width: 850px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid #334155;
}
.modal-title { font-weight: 700; font-size: 14px; color: #f8fafc; word-break: break-all; }
.close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; }
.close-btn:hover { color: #f8fafc; }
.modal-body { padding: 18px; text-align: center; overflow-y: auto; }
.overlay-drag {
    display: none;
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(37, 99, 235, 0.9);
    z-index: 10000;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
    font-size: 22px;
    font-weight: 800;
    pointer-events: none;
}
.received-file {
    background: #0f172a;
    border: 1px solid #10b981;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 10px;
}
.received-category {
    display: inline-block;
    margin-top: 6px;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
}
.empty {
    padding: 18px;
    text-align: center;
    color: #64748b;
    font-size: 13px;
    border: 1px dashed #334155;
    border-radius: 12px;
}
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DropLink</h1>
        <p>Connected to <b>${escapeHtml(senderName)}</b>. Transfer files directly over local Wi-Fi.</p>
    </div>

    <div class="card">
        <div class="card-title">📤 Upload Files or Folders</div>
        <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
            <div class="drop-zone-icon">📁</div>
            <div class="drop-zone-text">Click or drag & drop files / folders here</div>
        </div>
        <div class="btn-row">
            <button class="btn-select" onclick="document.getElementById('fileInput').click()">Select Files</button>
            <button class="btn-select" onclick="document.getElementById('folderInput').click()">Select Folder</button>
        </div>
        <input type="file" id="fileInput" multiple style="display:none;" onchange="handleFilesSelected(this.files)">
        <input type="file" id="folderInput" webkitdirectory directory multiple style="display:none;" onchange="handleFilesSelected(this.files)">
        <div id="selectedCount" style="margin-top: 10px; font-size: 12px; color: #94a3b8; display: none;"></div>
        <button id="uploadButton" class="upload-btn" onclick="uploadSelectedFiles()" disabled>Upload to Device</button>
        <div id="uploadStatus" class="status" style="display:none;"></div>
        <div class="progress" id="progressWrap" style="display:none;">
            <div class="progress-bar" id="progressBar"></div>
        </div>
    </div>

    <div class="card">
        <div class="card-title">📝 Quick Text & Clipboard</div>
        <div id="latestTextContainer" class="text-box" style="display:none;">
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">LATEST SHARED TEXT:</div>
            <div id="latestTextContent" class="text-content"></div>
            <button class="copy-btn" onclick="copySharedText()">📋 Copy to Clipboard</button>
        </div>
        <textarea id="quickTextInput" class="text-input" placeholder="Type or paste a message, URL, or note to send to phone..." rows="3"></textarea>
        <button class="upload-btn" style="background: #6366f1; margin-top: 10px;" onclick="sendQuickText()">Send Text to Phone</button>
        <div id="textStatus" class="status" style="display:none;"></div>
    </div>

    <div class="card">
        <div class="card-title">📥 Files on this device</div>
        <button id="downloadAllButton" class="download-all" onclick="downloadAll()">Download All Files</button>
        <div id="downloadStatus" class="status download-status"></div>
""")

            if (files.isEmpty()) {
                append("""<div class="empty">No files are currently shared by this device.</div>""")
            } else {
                files.forEachIndexed { index, file ->
                    val encodedName = URLEncoder.encode(file.name, "UTF-8")
                    val downloadText = if (file.downloadCount == 1) "Downloaded 1 time" else "Downloaded ${file.downloadCount} times"
                    val mime = (file.mimeType ?: "").lowercase()
                    val canPreview = mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/") || mime == "application/pdf"
                    val previewButton = if (canPreview) {
                        """<button class="preview-btn" onclick="previewMedia($index, '${escapeHtmlJs(file.name)}', '$mime')">👁️ Preview / Stream</button>"""
                    } else ""

                    append("""
<div class="file">
    <div class="file-info">
        <div class="file-name">${escapeHtml(file.name)}</div>
        <div class="file-size">${formatSize(file.size)} &bull; <span id="download-count-$index">$downloadText</span></div>
    </div>
    <div class="file-actions">
        <a class="download" href="/download/$index/$encodedName" onclick="downloadFile($index, '$encodedName', ${file.size}, event)">↓ Download</a>
        $previewButton
    </div>
</div>
""")
                }
            }

            append("""
    </div>

    <div class="card">
        <div class="card-title">💾 Received by this device</div>
        <div id="receivedFiles"><div class="empty">Checking received files...</div></div>
    </div>
</div>

<div class="overlay-drag" id="overlayDrag">Drop files or folders to upload</div>

<div class="modal-overlay" id="mediaModal" onclick="closeModal(event)">
    <div class="modal-content">
        <div class="modal-header">
            <div class="modal-title" id="modalTitle">Media Preview</div>
            <button class="close-btn" onclick="closeModalDirect()">&times;</button>
        </div>
        <div class="modal-body" id="modalBody"></div>
    </div>
</div>

<script>
let queuedFiles = [];
let latestReceivedText = "";

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    return (bytes / 1073741824).toFixed(2) + " GB";
}

function handleFilesSelected(files) {
    if (!files || files.length === 0) return;
    queuedFiles = Array.from(files);
    const countDiv = document.getElementById("selectedCount");
    countDiv.style.display = "block";
    let totalBytes = queuedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    countDiv.textContent = queuedFiles.length + " item(s) selected (" + formatSize(totalBytes) + ")";
    document.getElementById("uploadButton").disabled = false;
}

window.addEventListener("dragenter", (e) => { e.preventDefault(); document.getElementById("overlayDrag").style.display = "flex"; });
window.addEventListener("dragover", (e) => { e.preventDefault(); });
window.addEventListener("dragleave", (e) => {
    if (e.clientX === 0 || e.clientY === 0) document.getElementById("overlayDrag").style.display = "none";
});
window.addEventListener("drop", (e) => {
    e.preventDefault();
    document.getElementById("overlayDrag").style.display = "none";
    if (e.dataTransfer && e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
});

async function uploadSelectedFiles() {
    if (queuedFiles.length === 0) return;
    const btn = document.getElementById("uploadButton");
    const status = document.getElementById("uploadStatus");
    const pWrap = document.getElementById("progressWrap");
    const pBar = document.getElementById("progressBar");

    btn.disabled = true;
    pWrap.style.display = "block";
    status.style.display = "block";

    for (let i = 0; i < queuedFiles.length; i++) {
        const file = queuedFiles[i];
        const relPath = file.webkitRelativePath || file.name;
        status.textContent = "Uploading (" + (i+1) + "/" + queuedFiles.length + "): " + file.name + "...";

        await new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/upload", true);
            xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
            xhr.setRequestHeader("X-Relative-Path", encodeURIComponent(relPath));
            xhr.setRequestHeader("X-File-Type", file.type || "application/octet-stream");

            let lastTime = Date.now();
            let lastBytes = 0;

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    pBar.style.width = pct + "%";
                    const now = Date.now();
                    if (now - lastTime >= 500) {
                        const speed = ((e.loaded - lastBytes) * 1000) / Math.max(1, now - lastTime);
                        status.textContent = "Uploading (" + (i+1) + "/" + queuedFiles.length + "): " + file.name + " (" + pct + "% at " + formatSize(speed) + "/s)";
                        lastTime = now;
                        lastBytes = e.loaded;
                    }
                }
            };
            xhr.onload = () => { resolve(); };
            xhr.onerror = () => { resolve(); };
            xhr.send(file);
        });
    }

    status.textContent = "All files uploaded successfully!";
    pBar.style.width = "100%";
    queuedFiles = [];
    document.getElementById("fileInput").value = "";
    document.getElementById("folderInput").value = "";
    document.getElementById("selectedCount").style.display = "none";
    loadReceivedFiles();
}

async function sendQuickText() {
    const input = document.getElementById("quickTextInput");
    const text = input.value.trim();
    if (!text) return;
    const status = document.getElementById("textStatus");
    status.style.display = "block";
    status.textContent = "Sending text...";
    try {
        const res = await fetch("/text", { method: "POST", body: text });
        if (res.ok) {
            status.textContent = "Text shared with device!";
            input.value = "";
            loadSharedTexts();
        } else {
            status.textContent = "Failed to send text.";
        }
    } catch (e) {
        status.textContent = "Error: " + e.message;
    }
}

async function loadSharedTexts() {
    try {
        const res = await fetch("/text");
        if (!res.ok) return;
        const list = await res.json();
        if (list && list.length > 0) {
            latestReceivedText = list[0].text;
            document.getElementById("latestTextContainer").style.display = "block";
            document.getElementById("latestTextContent").textContent = latestReceivedText;
        }
    } catch (_) {}
}

function copySharedText() {
    if (!latestReceivedText) return;
    navigator.clipboard.writeText(latestReceivedText).then(() => {
        alert("Text copied to clipboard!");
    });
}

function previewMedia(index, name, mime) {
    const modal = document.getElementById("mediaModal");
    const title = document.getElementById("modalTitle");
    const body = document.getElementById("modalBody");
    title.textContent = name;
    body.innerHTML = "";

    const url = "/preview/" + index + "/" + encodeURIComponent(name);
    if (mime.startsWith("image/")) {
        body.innerHTML = "<img src='" + url + "' style='max-width:100%; max-height:75vh; border-radius:10px; object-fit:contain;'>";
    } else if (mime.startsWith("video/")) {
        body.innerHTML = "<video controls autoplay src='" + url + "' style='max-width:100%; max-height:75vh; border-radius:10px;'></video>";
    } else if (mime.startsWith("audio/")) {
        body.innerHTML = "<audio controls autoplay src='" + url + "' style='width:100%; margin-top:20px;'></audio>";
    } else if (mime === "application/pdf") {
        body.innerHTML = "<iframe src='" + url + "' style='width:100%; height:75vh; border:none; border-radius:10px;'></iframe>";
    }
    modal.style.display = "flex";
}

function closeModal(e) {
    if (e.target.id === "mediaModal") closeModalDirect();
}

function closeModalDirect() {
    const modal = document.getElementById("mediaModal");
    const body = document.getElementById("modalBody");
    body.innerHTML = "";
    modal.style.display = "none";
}

async function downloadFile(index, name, size, e) {
    // Handled by browser download anchor
}

async function downloadAll() {
    const btn = document.getElementById("downloadAllButton");
    const status = document.getElementById("downloadStatus");
    btn.disabled = true;
    status.style.display = "block";
    try {
        const res = await fetch("/shared");
        const files = await res.json();
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            status.textContent = "Downloading (" + (i+1) + "/" + files.length + "): " + f.name;
            const a = document.createElement("a");
            a.href = "/download/" + f.index + "/" + encodeURIComponent(f.name);
            a.download = f.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await new Promise(r => setTimeout(r, 600));
        }
        status.textContent = "All files downloaded.";
    } catch (e) {
        status.textContent = "Download failed: " + e.message;
    } finally {
        btn.disabled = false;
    }
}

async function loadReceivedFiles() {
    try {
        const res = await fetch("/received");
        if (!res.ok) return;
        const files = await res.json();
        const container = document.getElementById("receivedFiles");
        if (files.length === 0) {
            container.innerHTML = "<div class='empty'>No files received yet.</div>";
            return;
        }
        container.innerHTML = files.map(f =>
            "<div class='received-file'>" +
            "<div class='file-name'>" + escapeHtml(f.name) + "</div>" +
            "<div class='file-size'>" + formatSize(f.size) + "</div>" +
            "<span class='received-category'>" + escapeHtml(f.category) + "</span>" +
            "</div>"
        ).join("");
    } catch (_) {}
}

loadReceivedFiles();
loadSharedTexts();
setInterval(loadReceivedFiles, 3000);
setInterval(loadSharedTexts, 3000);
</script>
</body>
</html>""")
        }

        sendResponse(output, "200 OK", "text/html; charset=utf-8", html.toByteArray(Charsets.UTF_8))
    }

    private fun sendFile(
        output: BufferedOutputStream,
        path: String,
        request: String,
        isPreview: Boolean = false
    ) {
        val parts = path.removePrefix("/").split("/")
        if (parts.size < 2 || parts[0] != "download") {
            sendText(output, "404 Not Found", "File not found")
            return
        }

        val index = parts[1].toIntOrNull()
        if (index == null) {
            sendText(output, "404 Not Found", "Invalid file index")
            return
        }

        val file = synchronized(sharedFiles) { sharedFiles.getOrNull(index) }
        if (file == null) {
            sendText(output, "404 Not Found", "File not found")
            return
        }

        val totalSize = file.size
        val rangeStart = parseRangeStart(getHeader(request, "Range"), totalSize)
        if (rangeStart == INVALID_RANGE) {
            val header = "HTTP/1.1 416 Range Not Satisfiable\r\n" +
                "Content-Range: bytes */$totalSize\r\n" +
                "Connection: close\r\n\r\n"
            output.write(header.toByteArray(Charsets.UTF_8))
            output.flush()
            return
        }

        try {
            val inputStream = contentResolver.openInputStream(file.uri)
            if (inputStream == null) {
                sendText(output, "404 Not Found", "Unable to open selected file")
                return
            }

            inputStream.use { input ->
                if (rangeStart > 0L && !skipFully(input, rangeStart)) {
                    sendText(output, "416 Range Not Satisfiable", "Unable to resume this file")
                    return
                }

                val mimeType = file.mimeType ?: "application/octet-stream"
                val safeName = escapeHeader(file.name)
                val partial = rangeStart > 0L
                val contentLength = if (totalSize > 0L) totalSize - rangeStart else -1L
                val dispositionType = if (isPreview) "inline" else "attachment"
                val header = buildString {
                    append(if (partial) "HTTP/1.1 206 Partial Content\r\n" else "HTTP/1.1 200 OK\r\n")
                    append("Content-Type: $mimeType\r\n")
                    append("Accept-Ranges: bytes\r\n")
                    if (partial && totalSize > 0L) append("Content-Range: bytes $rangeStart-${totalSize - 1}/$totalSize\r\n")
                    if (contentLength >= 0L) append("Content-Length: $contentLength\r\n")
                    append("Content-Disposition: $dispositionType; filename=\"$safeName\"\r\n")
                    append("Cache-Control: no-cache\r\n")
                    append("Connection: close\r\n\r\n")
                }
                output.write(header.toByteArray(Charsets.UTF_8))
                output.flush()

                val buffer = ByteArray(1024 * 1024)
                var totalSent = rangeStart
                var lastTime = System.currentTimeMillis()
                var lastBytes = totalSent

                while (true) {
                    val bytesRead = input.read(buffer)
                    if (bytesRead == -1) break
                    output.write(buffer, 0, bytesRead)
                    totalSent += bytesRead
                    val now = System.currentTimeMillis()
                    if (now - lastTime >= 500) {
                        val speed = ((totalSent - lastBytes) * 1000) / maxOf(1L, now - lastTime)
                        onTransferProgress?.invoke(totalSent, totalSize, speed, file.name, false)
                        lastTime = now
                        lastBytes = totalSent
                    }
                }
                output.flush()
                onTransferProgress?.invoke(totalSent, totalSize, 0L, file.name, false)

                synchronized(sharedFiles) {
                    file.downloadCount++
                    Log.d(TAG, "DOWNLOAD COMPLETE: ${file.name} count=${file.downloadCount}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "DOWNLOAD ERROR", e)
        }
    }

    private fun parseRangeStart(rangeHeader: String?, totalSize: Long): Long {
        if (rangeHeader.isNullOrBlank()) return 0L
        if (totalSize <= 0L || !rangeHeader.startsWith("bytes=")) return INVALID_RANGE
        val start = rangeHeader.removePrefix("bytes=").substringBefore("-").trim().toLongOrNull()
            ?: return INVALID_RANGE
        return if (start in 0 until totalSize) start else INVALID_RANGE
    }

    private fun skipFully(input: InputStream, bytesToSkip: Long): Boolean {
        var remaining = bytesToSkip
        while (remaining > 0L) {
            val skipped = input.skip(remaining)
            if (skipped > 0L) {
                remaining -= skipped
            } else if (input.read() == -1) {
                return false
            } else {
                remaining--
            }
        }
        return true
    }

    private fun handleUpload(
        input: BufferedInputStream,
        output: BufferedOutputStream,
        request: String
    ) {
        val rawContentLength = getHeader(request, "Content-Length")?.toLongOrNull()
        if (rawContentLength == null || rawContentLength < 0) {
            sendText(output, "411 Length Required", "Content-Length is required.")
            return
        }
        val contentLength = rawContentLength

        val encodedName = getHeader(request, "X-File-Name")
        val encodedRelativePath = getHeader(request, "X-Relative-Path")

        val relativePath = try {
            if (!encodedRelativePath.isNullOrBlank()) {
                URLDecoder.decode(encodedRelativePath, "UTF-8")
            } else null
        } catch (_: Exception) { null }

        val requestedName = try {
            if (encodedName?.isNotBlank() == true) {
                URLDecoder.decode(encodedName, "UTF-8")
            } else "uploaded_file"
        } catch (_: Exception) { "uploaded_file" }

        val mimeType = getHeader(request, "X-File-Type")?.takeIf { it.isNotBlank() }
            ?: "application/octet-stream"

        val destination = createUploadDestination(requestedName, mimeType, relativePath)
        val category = destination.parentFile?.name ?: "Others"

        Log.d(TAG, "UPLOAD START: $requestedName (rel: $relativePath)")

        try {
            FileOutputStream(destination).use { fileOutput ->
                val buffer = ByteArray(1024 * 1024)
                var remaining = contentLength
                var received = 0L
                var lastTime = System.currentTimeMillis()
                var lastBytes = 0L

                while (remaining > 0) {
                    val requested = minOf(buffer.size.toLong(), remaining).toInt()
                    val bytesRead = input.read(buffer, 0, requested)
                    if (bytesRead == -1) {
                        throw Exception("Connection closed before upload completed.")
                    }
                    fileOutput.write(buffer, 0, bytesRead)
                    received += bytesRead
                    remaining -= bytesRead

                    val now = System.currentTimeMillis()
                    if (now - lastTime >= 500) {
                        val speed = ((received - lastBytes) * 1000) / maxOf(1L, now - lastTime)
                        onTransferProgress?.invoke(received, contentLength, speed, destination.name, true)
                        lastTime = now
                        lastBytes = received
                    }
                }

                fileOutput.flush()
                onTransferProgress?.invoke(received, contentLength, 0L, destination.name, true)

                try {
                    MediaScannerConnection.scanFile(
                        context,
                        arrayOf(destination.absolutePath),
                        arrayOf(mimeType),
                        null
                    )
                } catch (mediaEx: Exception) {
                    Log.w(TAG, "MediaScanner failed", mediaEx)
                }

                scanReceivedFiles()

                val receivedFile = ReceivedFile(
                    name = destination.name,
                    mimeType = mimeType,
                    size = received,
                    path = destination.absolutePath,
                    category = category
                )
                synchronized(receivedFiles) {
                    receivedFiles.add(0, receivedFile)
                }
                Log.d(TAG, "UPLOAD COMPLETE: " + destination.absolutePath)
            }

            sendText(output, "200 OK", "Upload completed: ${destination.name}")
        } catch (e: Exception) {
            try { destination.delete() } catch (_: Exception) {}
            Log.e(TAG, "UPLOAD ERROR", e)
            sendText(output, "500 Internal Server Error", "Upload failed: ${e.message}")
        }
    }

    private fun createUploadDestination(
        originalName: String,
        mimeType: String,
        relativePath: String? = null
    ): File {
        val root = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "DropLink")
        if (!root.exists()) root.mkdirs()

        if (!relativePath.isNullOrBlank()) {
            val segments = relativePath
                .replace('\\', '/')
                .split('/')
                .map { it.trim() }
                .filter { it.isNotEmpty() && it != ".." && it != "." }

            if (segments.isNotEmpty()) {
                var targetDir = root
                for (seg in segments.dropLast(1)) {
                    targetDir = File(targetDir, sanitizeFileName(seg))
                }
                if (!targetDir.exists()) targetDir.mkdirs()
                val safeFileName = sanitizeFileName(segments.last())
                return createUniqueFile(targetDir, safeFileName)
            }
        }

        val safeName = sanitizeFileName(originalName)
        val directoryName = getUploadDirectoryName(safeName, mimeType)
        val directory = File(root, directoryName)
        if (!directory.exists()) directory.mkdirs()
        if (!directory.exists()) throw Exception("Unable to create directory: " + directory.absolutePath)

        return createUniqueFile(directory, safeName)
    }

    private fun getUploadDirectoryName(fileName: String, mimeType: String): String {
        val type = mimeType.lowercase()
        if (type.startsWith("image/")) return "Images"
        if (type.startsWith("video/")) return "Videos"
        if (type.startsWith("audio/")) return "Audio"
        if (type.contains("pdf") || type.contains("document") || type.contains("text/")) return "Documents"
        if (type.contains("zip") || type.contains("compressed") || type.contains("tar") || type.contains("rar")) return "Archives"
        return "Others"
    }

    private fun createUniqueFile(directory: File, fileName: String): File {
        var file = File(directory, fileName)
        if (!file.exists()) return file

        val nameWithoutExtension = fileName.substringBeforeLast(".", fileName)
        val extension = if (fileName.contains(".")) "." + fileName.substringAfterLast(".") else ""
        var counter = 1
        while (file.exists()) {
            file = File(directory, "$nameWithoutExtension ($counter)$extension")
            counter++
        }
        return file
    }

    private fun sanitizeFileName(name: String): String {
        return name.replace(Regex("[\\\\/:*?\"<>|]"), "_").trim()
    }

    private fun sendSharedFilesJson(output: BufferedOutputStream) {
        val files = getSharedFiles()
        val json = buildString {
            append("[")
            files.forEachIndexed { index, file ->
                if (index > 0) append(",")
                append("{\"index\":$index,\"name\":\"${escapeJson(file.name)}\",\"size\":${file.size},\"mimeType\":\"${escapeJson(file.mimeType ?: "")}\",\"downloadCount\":${file.downloadCount}}")
            }
            append("]")
        }
        sendResponse(output, "200 OK", "application/json; charset=utf-8", json.toByteArray(Charsets.UTF_8))
    }

    private fun sendReceivedFilesJson(output: BufferedOutputStream) {
        val files = getReceivedFiles()
        val json = buildString {
            append("[")
            files.forEachIndexed { index, file ->
                if (index > 0) append(",")
                append("{\"name\":\"${escapeJson(file.name)}\",\"size\":${file.size},\"mimeType\":\"${escapeJson(file.mimeType)}\",\"category\":\"${escapeJson(file.category)}\"}")
            }
            append("]")
        }
        sendResponse(output, "200 OK", "application/json; charset=utf-8", json.toByteArray(Charsets.UTF_8))
    }

    private fun sendSharedTextsJson(output: BufferedOutputStream) {
        val texts = getSharedTexts()
        val json = buildString {
            append("[")
            texts.forEachIndexed { index, item ->
                if (index > 0) append(",")
                append("{\"id\":\"${escapeJson(item.id)}\",\"text\":\"${escapeJson(item.text)}\",\"timestamp\":${item.timestamp},\"sender\":\"${escapeJson(item.sender)}\"}")
            }
            append("]")
        }
        sendResponse(output, "200 OK", "application/json; charset=utf-8", json.toByteArray(Charsets.UTF_8))
    }

    private fun handleSharedTextPost(input: BufferedInputStream, output: BufferedOutputStream, request: String) {
        val length = getHeader(request, "Content-Length")?.toIntOrNull() ?: 0
        if (length <= 0) {
            sendText(output, "400 Bad Request", "Empty text")
            return
        }
        val buffer = ByteArray(minOf(length, 64 * 1024))
        var read = 0
        while (read < buffer.size) {
            val r = input.read(buffer, read, buffer.size - read)
            if (r == -1) break
            read += r
        }
        val body = String(buffer, 0, read, Charsets.UTF_8).trim()
        if (body.isNotEmpty()) {
            addSharedText(body, "browser")
            onTextReceived?.invoke(body)
            sendResponse(output, "200 OK", "application/json; charset=utf-8", "{\"success\":true}".toByteArray(Charsets.UTF_8))
        } else {
            sendText(output, "400 Bad Request", "Empty body")
        }
    }

    private fun sendResponse(
        output: BufferedOutputStream,
        status: String,
        contentType: String,
        data: ByteArray
    ) {
        val header = "HTTP/1.1 $status\r\n" +
            "Content-Type: $contentType\r\n" +
            "Content-Length: ${data.size}\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
            "Access-Control-Allow-Headers: *\r\n" +
            "Connection: close\r\n\r\n"
        output.write(header.toByteArray(Charsets.UTF_8))
        output.write(data)
        output.flush()
    }

    private fun sendText(output: BufferedOutputStream, status: String, text: String) {
        sendResponse(output, status, "text/plain; charset=utf-8", text.toByteArray(Charsets.UTF_8))
    }

    private fun escapeHtml(value: String): String {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#039;")
    }

    private fun escapeHtmlJs(value: String): String {
        return value.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"").replace("\n", " ").replace("\r", "")
    }

    private fun escapeJson(value: String): String {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
    }

    private fun escapeHeader(value: String): String {
        return value.replace("\\", "").replace("\"", "").replace("\r", "").replace("\n", "")
    }

    private fun formatSize(size: Long): String {
        if (size < 1024) return "$size B"
        if (size < 1024L * 1024L) return "%.1f KB".format(size / 1024.0)
        if (size < 1024L * 1024L * 1024L) return "%.1f MB".format(size / (1024.0 * 1024.0))
        return "%.2f GB".format(size / (1024.0 * 1024.0 * 1024.0))
    }
}
