package com.muqaddas123.droplink.internetshare

import java.net.InetAddress
import java.net.InetSocketAddress
import android.content.ContentResolver
import android.net.Uri
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.io.OutputStreamWriter
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.ConcurrentHashMap
import java.io.FileInputStream
import java.nio.channels.Channels

data class InternetSharedFile(
    val id: String,
    val uri: Uri,
    val name: String,
    val mimeType: String?,
    val size: Long
)

private class DownloadProgress(
    val total: Long,
    @Volatile var downloaded: Long = 0L,
    @Volatile var startedAt: Long = System.currentTimeMillis(),
    @Volatile var finishedAt: Long = 0L,
    @Volatile var done: Boolean = false,
    @Volatile var cancelled: Boolean = false,
    @Volatile var socket: Socket? = null
)

class InternetTransferServer(
    private val contentResolver: ContentResolver
) {

    companion object {
        private const val TAG = "DropLinkInternet"
        private const val SOCKET_BUFFER_SIZE = 1024 * 1024
        private const val SERVER_BACKLOG = 128
    }

    private var serverSocket: ServerSocket? = null

    private val executor =
        Executors.newCachedThreadPool()

    @Volatile
    private var running = false

    @Volatile
    private var paused = false

    @Volatile
    private var files: List<InternetSharedFile> =
        emptyList()

    private val downloadProgress =
        ConcurrentHashMap<String, DownloadProgress>()

    var port: Int = 0
        private set

    var bindAddress: InetAddress? = null
        private set

    fun setFiles(
        sharedFiles: List<InternetSharedFile>
    ) {
        files = sharedFiles.toList()

        android.util.Log.d(
            TAG,
            "FILES SET: ${files.size}"
        )
    }

    /**
     * Starts the server.
     *
     * IMPORTANT:
     *
     * We do NOT bind the socket to the selected IPv6
     * address.
     *
     * ServerSocket(0, 50) listens on all local interfaces.
     *
     * NetworkUtils is still used to determine which
     * public IPv6 address should be displayed to the user.
     */
    @Synchronized
    fun start(): Int {

        if (running && serverSocket != null) {
            return port
        }

        try {

            /*
             * IMPORTANT:
             *
             * Do NOT use:
             *
             * ServerSocket(0, 50, address)
             *
             * Use wildcard binding instead.
             */
            serverSocket = ServerSocket().apply {
                reuseAddress = true
                receiveBufferSize = SOCKET_BUFFER_SIZE
                bind(InetSocketAddress(0), SERVER_BACKLOG)
            }

            port =
                serverSocket!!.localPort

            running = true
            paused = false

            val internetAddress =
                NetworkUtils
                    .getInternetNetworkAddress()

            bindAddress =
                internetAddress?.address

            android.util.Log.d(
                TAG,
                "================================"
            )

            android.util.Log.d(
                TAG,
                "SERVER STARTED"
            )

            android.util.Log.d(
                TAG,
                "PORT: $port"
            )

            android.util.Log.d(
                TAG,
                "PUBLIC ADDRESS: " +
                    (
                        bindAddress
                            ?.hostAddress
                            ?: "NONE"
                    )
            )

            if (bindAddress != null) {

                android.util.Log.d(
                    TAG,
                    "SHARE URL: " +
                        getServerUrl()
                )
            }

            android.util.Log.d(
                TAG,
                "================================"
            )

            executor.execute {

                while (running) {

                    try {

                        val socket =
                            serverSocket
                                ?.accept()
                                ?: break

                        // Keep the transfer window full and avoid delaying
                        // small HTTP control packets behind file data.
                        socket.tcpNoDelay = true
                        socket.keepAlive = true
                        socket.sendBufferSize = SOCKET_BUFFER_SIZE
                        socket.receiveBufferSize = SOCKET_BUFFER_SIZE

                        android.util.Log.d(
                            TAG,
                            "CLIENT CONNECTED: " +
                                socket.inetAddress
                                    .hostAddress
                        )

                        executor.execute {
                            handleClient(socket)
                        }

                    } catch (e: Exception) {

                        if (running) {

                            android.util.Log.e(
                                TAG,
                                "ACCEPT ERROR",
                                e
                            )
                        }
                    }
                }
            }

            return port

        } catch (e: Exception) {

            android.util.Log.e(
                TAG,
                "SERVER START ERROR",
                e
            )

            running = false
            port = 0
            bindAddress = null

            try {
                serverSocket?.close()
            } catch (_: Exception) {
            }

            serverSocket = null

            throw e
        }
    }

    /**
     * Returns:
     *
     * IPv4:
     * http://1.2.3.4:12345/
     *
     * IPv6:
     * http://[2001:db8::1]:12345/
     */
    fun getServerUrl(): String? {

        val address =
            bindAddress
                ?.hostAddress
                ?: NetworkUtils
                    .getInternetNetworkAddress()
                    ?.address
                    ?.hostAddress
                ?: return null

        if (port <= 0) {
            return null
        }

        return if (address.contains(":")) {

            "http://[$address]:$port/"

        } else {

            "http://$address:$port/"
        }
    }

    fun pause() {

        paused = true

        android.util.Log.d(
            TAG,
            "SERVER PAUSED"
        )
    }

    fun resume() {

        paused = false

        android.util.Log.d(
            TAG,
            "SERVER RESUMED"
        )
    }

    @Synchronized
    fun stop() {

        running = false
        paused = false

        try {
            serverSocket?.close()
        } catch (_: Exception) {
        }

        serverSocket = null
        port = 0
        bindAddress = null

        android.util.Log.d(
            TAG,
            "SERVER STOPPED"
        )
    }

    private fun handleClient(
        socket: Socket
    ) {

        socket.use {

            try {

                it.soTimeout = 30_000

                val reader =
                    BufferedReader(
                        InputStreamReader(
                            it.getInputStream(),
                            Charsets.ISO_8859_1
                        )
                    )

                val output =
                    it.getOutputStream()

                /*
                 * HTTP request line.
                 */
                val requestLine =
                    reader.readLine()
                        ?: return

                android.util.Log.d(
                    TAG,
                    "REQUEST: $requestLine"
                )

                /*
                 * HTTP headers.
                 */
                val headers =
                    mutableMapOf<String, String>()

                while (true) {

                    val line =
                        reader.readLine()
                            ?: break

                    if (line.isEmpty()) {
                        break
                    }

                    val separator =
                        line.indexOf(':')

                    if (separator > 0) {

                        val key =
                            line.substring(
                                0,
                                separator
                            )
                                .trim()
                                .lowercase()

                        val value =
                            line.substring(
                                separator + 1
                            )
                                .trim()

                        headers[key] = value
                    }
                }

                val parts =
                    requestLine.split(
                        " ",
                        limit = 3
                    )

                if (parts.size < 2) {

                    sendError(
                        output,
                        400,
                        "Bad Request"
                    )

                    return
                }

                val method =
                    parts[0]

                val rawPath =
                    parts[1]

                if (
                    method != "GET" &&
                    method != "HEAD"
                ) {

                    sendError(
                        output,
                        405,
                        "Method Not Allowed"
                    )

                    return
                }

                val decodedRequest =
                    URLDecoder.decode(
                        rawPath,
                        "UTF-8"
                    )

                val queryIndex = decodedRequest.indexOf('?')

                val path =
                    if (queryIndex >= 0) {
                        decodedRequest.substring(0, queryIndex)
                    } else {
                        decodedRequest
                    }

                val query =
                    if (queryIndex >= 0) {
                        decodedRequest.substring(queryIndex + 1)
                    } else {
                        ""
                    }

                val queryParams = parseQuery(query)

                when {

                    path == "/" -> {

                        sendHomePage(
                            output
                        )
                    }

                    path == "/api/files" -> {

                        sendFileList(
                            output
                        )
                    }

                    path == "/api/download-status" -> {

                        sendDownloadStatus(
                            output,
                            queryParams["id"]
                        )
                    }

                    path == "/api/cancel-download" -> {

                        cancelDownload(
                            output,
                            queryParams["id"]
                        )
                    }

                    path.startsWith(
                        "/download/"
                    ) -> {

                        val fileId =
                            path.removePrefix(
                                "/download/"
                            )

                        val downloadId = queryParams["downloadId"]

                        sendFile(
                            output,
                            method,
                            fileId,
                            headers["range"],
                            downloadId,
                            it
                        )
                    }

                    else -> {

                        sendError(
                            output,
                            404,
                            "Not Found"
                        )
                    }
                }

            } catch (e: Exception) {

                if (running) {

                    android.util.Log.e(
                        TAG,
                        "CLIENT ERROR",
                        e
                    )
                }
            }
        }
    }

    private fun sendHomePage(
        output: OutputStream
    ) {

        val html =
            buildHomePage()

        val bytes =
            html.toByteArray(
                Charsets.UTF_8
            )

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write(
            "HTTP/1.1 200 OK\r\n"
        )

        writer.write(
            "Content-Type: text/html; charset=utf-8\r\n"
        )

        writer.write(
            "Content-Length: ${bytes.size}\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "Cache-Control: no-store\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        output.write(bytes)
        output.flush()
    }

    private fun buildHomePage(): String {

        val fileHtml =
            if (files.isEmpty()) {
                """
                <div class="empty">
                    <div class="emptyIcon">📭</div>
                    <div class="emptyText">No files are currently shared.</div>
                </div>
                """.trimIndent()
            } else {
                files.joinToString("\n") { file ->

                    val safeName =
                        escapeHtml(file.name)

                    val size =
                        formatSize(file.size)

                    """
                    <div class="file">
                        <div class="fileIcon">📄</div>
                        <div class="fileInfo">
                            <div class="fileName">$safeName</div>
                            <div class="fileSize">$size</div>
                        </div>
                        <a
                            class="downloadBtn"
                            data-file-id="${escapeHtml(file.id)}"
                            data-file-name="$safeName"
                            data-file-size="${file.size}"
                            href="/download/${file.id}"
                        >
                            Download
                        </a>
                    </div>
                    """.trimIndent()
                }
            }

        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <meta charset="utf-8" />
            <title>DropLink</title>
            <style>
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg:       #0a0f1e;
                    --surface:  #111827;
                    --surface2: #1a2235;
                    --border:   rgba(255,255,255,0.07);
                    --primary:  #3b82f6;
                    --primary2: #1d4ed8;
                    --success:  #10b981;
                    --danger:   #ef4444;
                    --text:     #f1f5f9;
                    --sub:      #94a3b8;
                    --muted:    #475569;
                }
                body {
                    background: var(--bg);
                    color: var(--text);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    min-height: 100vh;
                    padding: 24px 16px 48px;
                }
                .wrap   { max-width: 640px; margin: 0 auto; }

                /* Brand bar */
                .brand  {
                    display: flex; align-items: center; gap: 12px;
                    margin-bottom: 28px;
                }
                .brandLogo {
                    width: 42px; height: 42px; border-radius: 13px;
                    background: var(--primary);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 22px; font-weight: 900; color: #fff;
                    box-shadow: 0 0 16px rgba(59,130,246,0.4);
                }
                .brandName  { font-size: 22px; font-weight: 900; }
                .brandSub   { font-size: 12px; color: var(--muted); margin-top: 2px; }

                /* Card */
                .card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 22px;
                    margin-bottom: 16px;
                }
                .cardTitle  { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
                .cardSub    { font-size: 13px; color: var(--sub); }

                /* Download all button */
                .dlAllBtn {
                    width: 100%; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    padding: 15px;
                    background: var(--primary2);
                    color: #fff; font-size: 15px; font-weight: 800;
                    border-radius: 14px;
                    border: 1px solid rgba(59,130,246,0.4);
                    margin-top: 14px;
                    transition: opacity 0.15s;
                }
                .dlAllBtn:disabled { opacity: 0.5; cursor: not-allowed; }
                .dlAllBtn:hover:not(:disabled) { background: #2563eb; }

                /* Progress card */
                .progressCard {
                    display: none;
                    background: var(--surface2);
                    border: 1px solid rgba(59,130,246,0.2);
                    border-radius: 16px;
                    padding: 18px;
                    margin-top: 14px;
                }
                .progressTop    { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
                .progressName   { font-weight: 700; word-break: break-word; font-size: 14px; }
                .progressStatus { color: var(--sub); font-size: 12px; margin-top: 4px; }
                .progressPct    { font-weight: 800; white-space: nowrap; color: var(--primary); font-size: 16px; }
                .bar {
                    width: 100%; height: 8px; margin-top: 14px;
                    border-radius: 999px; overflow: hidden;
                    background: rgba(255,255,255,0.08);
                }
                .barFill {
                    width: 0%; height: 100%;
                    background: linear-gradient(90deg, #1d4ed8, #3b82f6);
                    border-radius: 999px;
                    transition: width 0.2s linear;
                }
                .stats {
                    display: grid; grid-template-columns: repeat(3,1fr);
                    gap: 8px; margin-top: 14px;
                }
                .stat {
                    padding: 10px; border-radius: 10px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid var(--border);
                    font-size: 11px; color: var(--muted);
                }
                .stat strong { display: block; margin-top: 3px; color: var(--text); font-size: 13px; }
                .cancelBtn {
                    width: 100%; margin-top: 12px; border: none; cursor: pointer;
                    background: rgba(239,68,68,0.15);
                    color: #fca5a5; font-weight: 800; font-size: 13px;
                    padding: 11px 14px; border-radius: 11px;
                    border: 1px solid rgba(239,68,68,0.25);
                }
                .cancelBtn:disabled { opacity: 0.4; cursor: not-allowed; }

                /* File list */
                .file {
                    display: flex; align-items: center; gap: 14px;
                    padding: 14px 0;
                    border-bottom: 1px solid var(--border);
                }
                .file:last-child { border-bottom: none; }
                .fileIcon  { font-size: 24px; flex-shrink: 0; }
                .fileInfo  { flex: 1; min-width: 0; }
                .fileName  { font-weight: 700; word-break: break-word; font-size: 14px; }
                .fileSize  { color: var(--sub); font-size: 12px; margin-top: 3px; }
                .downloadBtn {
                    text-decoration: none; color: #fff;
                    background: var(--primary);
                    padding: 10px 16px; border-radius: 10px;
                    font-weight: 700; font-size: 13px;
                    white-space: nowrap; flex-shrink: 0;
                    transition: background 0.15s;
                }
                .downloadBtn:hover { background: #2563eb; }

                /* Empty state */
                .empty { text-align: center; padding: 32px 0; }
                .emptyIcon { font-size: 40px; margin-bottom: 12px; }
                .emptyText { color: var(--sub); font-size: 14px; }

                /* Note */
                .note {
                    display: flex; align-items: flex-start; gap: 10px;
                    background: rgba(59,130,246,0.06);
                    border: 1px solid rgba(59,130,246,0.15);
                    border-radius: 13px; padding: 14px;
                }
                .noteIcon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
                .noteText { color: var(--sub); font-size: 13px; line-height: 1.5; }

                @media (max-width: 480px) {
                    body { padding: 16px 12px 40px; }
                    .file { flex-wrap: wrap; }
                    .downloadBtn { width: 100%; text-align: center; }
                    .stats { grid-template-columns: 1fr; }
                }
            </style>
        </head>
        <body>
        <div class="wrap">

            <div class="brand">
                <div class="brandLogo">D</div>
                <div>
                    <div class="brandName">DropLink</div>
                    <div class="brandSub">Private file sharing</div>
                </div>
            </div>

            <div class="card">
                <div class="cardTitle">Files available</div>
                <div class="cardSub">Shared directly from the sender's device</div>

                <button
                    class="dlAllBtn"
                    id="downloadAll"
                    type="button"
                    ${if (files.isEmpty()) "disabled" else ""}
                >
                    ${if (files.isEmpty()) "No files available" else "⬇  Download All"}
                </button>

                <div class="progressCard" id="progressCard" aria-live="polite">
                    <div class="progressTop">
                        <div>
                            <div class="progressName"   id="progressName">Preparing...</div>
                            <div class="progressStatus" id="progressStatus">Starting download</div>
                        </div>
                        <div class="progressPct" id="progressPercent">0%</div>
                    </div>

                    <div class="bar">
                        <div class="barFill" id="barFill"></div>
                    </div>

                    <div class="stats">
                        <div class="stat">Downloaded<strong id="downloadedText">0 B</strong></div>
                        <div class="stat">Remaining<strong  id="remainingText">0 B</strong></div>
                        <div class="stat">Speed<strong       id="speedText">— B/s</strong></div>
                    </div>

                    <button class="cancelBtn" id="cancelDownload" type="button">
                        Skip / Cancel
                    </button>
                </div>

                $fileHtml
            </div>

            <div class="note">
                <span class="noteIcon">ℹ️</span>
                <span class="noteText">
                    Keep the sender's screen active while downloading.
                    All transfers happen directly between devices — no cloud storage.
                </span>
            </div>

        </div>
        <script>
            (function () {
                const allButton   = document.getElementById('downloadAll');
                const progressCard= document.getElementById('progressCard');
                const progressName= document.getElementById('progressName');
                const progressSt  = document.getElementById('progressStatus');
                const progressPct = document.getElementById('progressPercent');
                const barFill     = document.getElementById('barFill');
                const dlText      = document.getElementById('downloadedText');
                const remText     = document.getElementById('remainingText');
                const spdText     = document.getElementById('speedText');
                const cancelBtn   = document.getElementById('cancelDownload');

                const links = Array.from(document.querySelectorAll('.downloadBtn'));
                let queue = [], queueIndex = 0, activeId = null;
                let pollTimer = null, lastBytes = 0, lastTime = 0, cancelling = false;

                function fmt(b) {
                    if (!Number.isFinite(b) || b < 0) b = 0;
                    if (b < 1024)            return Math.round(b) + ' B';
                    if (b < 1048576)         return (b/1024).toFixed(1) + ' KB';
                    if (b < 1073741824)      return (b/1048576).toFixed(1) + ' MB';
                    return (b/1073741824).toFixed(2) + ' GB';
                }

                function stopPoll() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }

                function resetProgress(file) {
                    progressCard.style.display = 'block';
                    progressName.textContent = file.name;
                    progressSt.textContent   = 'Starting download...';
                    progressPct.textContent  = '0%';
                    barFill.style.width      = '0%';
                    dlText.textContent       = '0 B';
                    remText.textContent      = fmt(file.size);
                    spdText.textContent      = '— B/s';
                    lastBytes = 0; lastTime = Date.now(); cancelling = false;
                    cancelBtn.disabled = false;
                }

                async function poll(file) {
                    if (!activeId) return;
                    try {
                        const r = await fetch('/api/download-status?id=' + encodeURIComponent(activeId), { cache: 'no-store' });
                        const d = await r.json();
                        if (d.status === 'not_found') {
                            progressSt.textContent = 'Starting...';
                            pollTimer = setTimeout(() => poll(file), 300);
                            return;
                        }
                        const dl  = Math.max(0, +d.downloaded || 0);
                        const tot = Math.max(0, +d.total || file.size || 0);
                        const rem = Math.max(0, tot - dl);
                        const now = Date.now();
                        const spd = Math.max(0, (dl - lastBytes) * 1000 / Math.max(1, now - lastTime));
                        const pct = tot > 0 ? Math.min(100, dl / tot * 100) : 100;
                        lastBytes = dl; lastTime = now;
                        progressPct.textContent = Math.round(pct) + '%';
                        barFill.style.width     = pct + '%';
                        dlText.textContent      = fmt(dl);
                        remText.textContent     = fmt(rem);
                        spdText.textContent     = fmt(spd) + '/s';
                        if (d.cancelled) {
                            progressSt.textContent = 'Cancelled. Moving to next...';
                            stopPoll(); activeId = null; cancelling = false;
                            queueIndex++; setTimeout(next, 150); return;
                        }
                        if (d.done) {
                            progressSt.textContent = 'Done! Moving to next...';
                            stopPoll(); activeId = null;
                            queueIndex++; setTimeout(next, 350); return;
                        }
                        progressSt.textContent = 'Downloading...';
                        pollTimer = setTimeout(() => poll(file), 350);
                    } catch (_) {
                        pollTimer = setTimeout(() => poll(file), 700);
                    }
                }

                function next() {
                    if (queueIndex >= queue.length) {
                        activeId = null;
                        allButton.disabled = false;
                        allButton.textContent = '✓  All downloads complete';
                        cancelBtn.disabled = true;
                        progressSt.textContent = 'All done!';
                        progressPct.textContent = '100%';
                        barFill.style.width = '100%';
                        return;
                    }
                    const file = queue[queueIndex];
                    activeId = (crypto.randomUUID ? crypto.randomUUID() : 'dl-' + Date.now() + '-' + Math.random().toString(16).slice(2));
                    resetProgress(file);
                    allButton.disabled = true;
                    allButton.textContent = 'Downloading ' + (queueIndex + 1) + ' / ' + queue.length + '…';
                    const a = document.createElement('a');
                    a.href     = '/download/' + encodeURIComponent(file.id) + '?downloadId=' + encodeURIComponent(activeId);
                    a.download = '';
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click(); a.remove();
                    poll(file);
                }

                allButton.addEventListener('click', function () {
                    if (!links.length) return;
                    stopPoll();
                    queue = links.map(l => ({
                        id:   l.getAttribute('data-file-id'),
                        name: l.getAttribute('data-file-name') || 'File',
                        size: Number(l.getAttribute('data-file-size')) || 0
                    }));
                    queueIndex = 0; cancelling = false; next();
                });

                cancelBtn.addEventListener('click', async function () {
                    if (!activeId || cancelling) return;
                    cancelling = true; cancelBtn.disabled = true;
                    progressSt.textContent = 'Cancelling...';
                    try { await fetch('/api/cancel-download?id=' + encodeURIComponent(activeId), { cache: 'no-store' }); }
                    catch (_) {}
                });
            })();
        </script>
        </body>
        </html>
        """.trimIndent()
    }

    private fun parseQuery(query: String): Map<String, String> {

        if (query.isBlank()) {
            return emptyMap()
        }

        return query
            .split("&")
            .mapNotNull { part ->
                val separator = part.indexOf('=')
                if (separator <= 0) {
                    null
                } else {
                    val key = URLDecoder.decode(
                        part.substring(0, separator),
                        "UTF-8"
                    )
                    val value = URLDecoder.decode(
                        part.substring(separator + 1),
                        "UTF-8"
                    )
                    key to value
                }
            }
            .toMap()
    }

    private fun sendDownloadStatus(
        output: OutputStream,
        downloadId: String?
    ) {

        if (downloadId.isNullOrBlank()) {
            sendJson(
                output,
                "{\"status\":\"not_found\"}"
            )
            return
        }

        val progress =
            downloadProgress[downloadId]

        if (progress == null) {
            sendJson(
                output,
                "{\"status\":\"not_found\"}"
            )
            return
        }

        val json =
            """
            {
              "status":"ok",
              "total":${progress.total},
              "downloaded":${progress.downloaded.coerceAtLeast(0L)},
              "done":${progress.done},
              "cancelled":${progress.cancelled}
            }
            """.trimIndent()

        sendJson(output, json)
    }

    private fun cancelDownload(
        output: OutputStream,
        downloadId: String?
    ) {

        if (downloadId.isNullOrBlank()) {
            sendJson(
                output,
                "{\"status\":\"not_found\"}"
            )
            return
        }

        val progress =
            downloadProgress[downloadId]

        if (progress == null) {
            sendJson(
                output,
                "{\"status\":\"not_found\"}"
            )
            return
        }

        progress.cancelled = true

        try {
            progress.socket?.close()
        } catch (_: Exception) {
        }

        sendJson(
            output,
            "{\"status\":\"cancelled\"}"
        )
    }

    private fun sendJson(
        output: OutputStream,
        json: String
    ) {

        val bytes =
            json.toByteArray(Charsets.UTF_8)

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write("HTTP/1.1 200 OK\r\n")
        writer.write("Content-Type: application/json; charset=utf-8\r\n")
        writer.write("Content-Length: ${bytes.size}\r\n")
        writer.write("Cache-Control: no-store\r\n")
        writer.write("Access-Control-Allow-Origin: *\r\n")
        writer.write("Connection: close\r\n")
        writer.write("\r\n")
        writer.flush()

        output.write(bytes)
        output.flush()
    }

    private fun sendFileList(
        output: OutputStream
    ) {

        val json =
            buildString {

                append("[")

                files.forEachIndexed {
                    index,
                    file ->

                    if (index > 0) {
                        append(",")
                    }

                    append("{")

                    append("\"id\":\"")

                    append(
                        escapeJson(
                            file.id
                        )
                    )

                    append("\",")

                    append("\"name\":\"")

                    append(
                        escapeJson(
                            file.name
                        )
                    )

                    append("\",")

                    append("\"mimeType\":\"")

                    append(
                        escapeJson(
                            file.mimeType
                                ?: "application/octet-stream"
                        )
                    )

                    append("\",")

                    append("\"size\":")

                    append(
                        file.size
                    )

                    append("}")
                }

                append("]")
            }

        val bytes =
            json.toByteArray(
                Charsets.UTF_8
            )

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write(
            "HTTP/1.1 200 OK\r\n"
        )

        writer.write(
            "Content-Type: application/json; charset=utf-8\r\n"
        )

        writer.write(
            "Content-Length: ${bytes.size}\r\n"
        )

        writer.write(
            "Access-Control-Allow-Origin: *\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        output.write(bytes)
        output.flush()
    }

    private fun sendFile(
        output: OutputStream,
        method: String,
        fileId: String,
        rangeHeader: String?,
        downloadId: String?,
        socket: Socket
    ) {

        val file =
            files.firstOrNull {
                it.id == fileId
            }

        if (file == null) {

            sendError(
                output,
                404,
                "File not found"
            )

            return
        }

        if (paused) {

            sendError(
                output,
                503,
                "Transfer paused"
            )

            return
        }

        val totalSize =
            file.size

        val progress =
            if (!downloadId.isNullOrBlank() && method == "GET") {
                DownloadProgress(total = totalSize).also {
                    it.socket = socket
                    downloadProgress[downloadId] = it
                }
            } else {
                null
            }

        /*
         * Empty file.
         */
        if (totalSize == 0L) {

            val writer =
                BufferedWriter(
                    OutputStreamWriter(
                        output,
                        Charsets.UTF_8
                    )
                )

            writer.write(
                "HTTP/1.1 200 OK\r\n"
            )

            writer.write(
                "Content-Type: ${
                    file.mimeType
                        ?: "application/octet-stream"
                }\r\n"
            )

            writer.write(
                "Content-Length: 0\r\n"
            )

            writer.write(
                "Accept-Ranges: bytes\r\n"
            )

            writer.write(
                "Content-Disposition: attachment; " +
                    "filename=\"${escapeHeader(file.name)}\"\r\n"
            )

            writer.write(
                "Connection: close\r\n"
            )

            writer.write(
                "\r\n"
            )

            writer.flush()

            progress?.let {
                it.downloaded = 0L
                it.done = true
                it.finishedAt = System.currentTimeMillis()
            }

            return
        }

        val range =
            parseRange(
                rangeHeader,
                totalSize
            )

        /*
         * Invalid Range.
         */
        if (
            rangeHeader != null &&
            range == null
        ) {

            sendRangeError(
                output,
                totalSize
            )

            return
        }

        val start =
            range?.first ?: 0L

        val end =
            range?.second
                ?: (totalSize - 1)

        val contentLength =
            end - start + 1

        val partial =
            range != null

        val status =
            if (partial) {
                "206 Partial Content"
            } else {
                "200 OK"
            }

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write(
            "HTTP/1.1 $status\r\n"
        )

        writer.write(
            "Content-Type: ${
                file.mimeType
                    ?: "application/octet-stream"
            }\r\n"
        )

        writer.write(
            "Content-Length: $contentLength\r\n"
        )

        writer.write(
            "Accept-Ranges: bytes\r\n"
        )

        if (partial) {

            writer.write(
                "Content-Range: " +
                    "bytes $start-$end/$totalSize\r\n"
            )
        }

        writer.write(
            "Content-Disposition: attachment; " +
                "filename=\"${escapeHeader(file.name)}\"\r\n"
        )

        writer.write(
            "Cache-Control: no-store\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        if (method == "HEAD") {
            return
        }

        try {
            streamFileRange(
                output,
                file,
                start,
                contentLength,
                progress
            )

            progress?.let {
                if (!it.cancelled && it.downloaded >= contentLength) {
                    it.downloaded = contentLength
                    it.done = true
                    it.finishedAt = System.currentTimeMillis()
                }
            }
        } catch (e: Exception) {
            progress?.let {
                if (!it.cancelled) {
                    it.cancelled = true
                }
            }
        }
    }

    /**
     * Streams a byte range of [file] to [output].
     *
     * Uses FileChannel.transferTo() which maps to Linux sendfile(2) on Android —
     * data moves directly from the page cache to the socket buffer with no JVM heap
     * copies, giving roughly 2–5× higher throughput than a ByteArray copy loop.
     *
     * Falls back to a classic ByteArray loop for synthetic/virtual URIs that
     * cannot produce a seekable FileDescriptor.
     */
    private fun streamFileRange(
        output: OutputStream,
        file: InternetSharedFile,
        start: Long,
        length: Long,
        progress: DownloadProgress?
    ) {
        val pfd = try {
            contentResolver.openFileDescriptor(file.uri, "r")
        } catch (_: Exception) {
            null
        }

        if (pfd == null) {
            streamFileRangeFallback(output, file, start, length, progress)
            return
        }

        pfd.use {
            val inChannel  = FileInputStream(it.fileDescriptor).channel
            val outChannel = Channels.newChannel(output)

            inChannel.use {
                var pos       = start
                var remaining = length

                while (remaining > 0 && running) {

                    // Respect pause without busy-spinning
                    while (paused && running) {
                        Thread.sleep(50)
                    }

                    if (!running) break
                    if (progress?.cancelled == true) break

                    // 8 MB slices keep progress updates frequent on large files
                    val toTransfer  = minOf(remaining, 8L * 1024 * 1024)
                    val transferred = inChannel.transferTo(pos, toTransfer, outChannel)

                    if (transferred <= 0) break

                    pos       += transferred
                    remaining -= transferred
                    progress?.downloaded = (length - remaining).coerceAtLeast(0L)
                }

                output.flush()
            }
        }
    }

    /** Fallback ByteArray copy — used when a seekable FileDescriptor is unavailable. */
    private fun streamFileRangeFallback(
        output: OutputStream,
        file: InternetSharedFile,
        start: Long,
        length: Long,
        progress: DownloadProgress?
    ) {
        val input = contentResolver.openInputStream(file.uri) ?: return

        input.use {
            skipFully(it, start)

            val buffer    = ByteArray(1024 * 1024)
            var remaining = length

            while (remaining > 0 && running) {

                while (paused && running) {
                    Thread.sleep(100)
                }

                if (!running) break
                if (progress?.cancelled == true) break

                val wanted = minOf(buffer.size.toLong(), remaining).toInt()
                val read   = it.read(buffer, 0, wanted)

                if (read <= 0) break

                output.write(buffer, 0, read)
                remaining -= read
                progress?.downloaded = (length - remaining).coerceAtLeast(0L)
            }

            output.flush()
        }
    }

    private fun skipFully(
        input: InputStream,
        amount: Long
    ) {

        var remaining =
            amount

        while (remaining > 0) {

            val skipped =
                input.skip(
                    remaining
                )

            if (skipped <= 0) {

                if (input.read() == -1) {
                    break
                }

                remaining--

            } else {

                remaining -= skipped
            }
        }
    }

    /**
     * Supports:
     *
     * bytes=0-999
     * bytes=1000-
     * bytes=-1000
     */
    private fun parseRange(
        value: String?,
        totalSize: Long
    ): Pair<Long, Long>? {

        if (
            value == null ||
            !value.startsWith("bytes=") ||
            totalSize <= 0
        ) {
            return null
        }

        return try {

            val rangeValue =
                value
                    .removePrefix("bytes=")
                    .split(",")
                    .first()
                    .trim()

            val dash =
                rangeValue.indexOf('-')

            if (dash < 0) {
                return null
            }

            val startText =
                rangeValue
                    .substring(
                        0,
                        dash
                    )
                    .trim()

            val endText =
                rangeValue
                    .substring(
                        dash + 1
                    )
                    .trim()

            /*
             * bytes=-1000
             */
            if (startText.isEmpty()) {

                val suffixLength =
                    endText.toLong()

                if (suffixLength <= 0) {
                    return null
                }

                val start =
                    maxOf(
                        0L,
                        totalSize - suffixLength
                    )

                return Pair(
                    start,
                    totalSize - 1
                )
            }

            val start =
                startText.toLong()

            if (
                start < 0 ||
                start >= totalSize
            ) {
                return null
            }

            val end =
                if (endText.isEmpty()) {

                    totalSize - 1

                } else {

                    endText.toLong()
                }

            if (end < start) {
                return null
            }

            Pair(
                start,
                minOf(
                    end,
                    totalSize - 1
                )
            )

        } catch (_: Exception) {

            null
        }
    }

    private fun sendRangeError(
        output: OutputStream,
        totalSize: Long
    ) {

        val body =
            """
            <html>
            <body>
            <h2>416</h2>
            <p>Requested Range Not Satisfiable</p>
            </body>
            </html>
            """.trimIndent()

        val bytes =
            body.toByteArray(
                Charsets.UTF_8
            )

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        writer.write(
            "HTTP/1.1 416 Range Not Satisfiable\r\n"
        )

        writer.write(
            "Content-Range: bytes */$totalSize\r\n"
        )

        writer.write(
            "Content-Type: text/html; charset=utf-8\r\n"
        )

        writer.write(
            "Content-Length: ${bytes.size}\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        output.write(bytes)
        output.flush()
    }

    private fun sendError(
        output: OutputStream,
        statusCode: Int,
        message: String
    ) {

        val body =
            """
            <html>
            <body>
            <h2>$statusCode</h2>
            <p>${escapeHtml(message)}</p>
            </body>
            </html>
            """.trimIndent()

        val bytes =
            body.toByteArray(
                Charsets.UTF_8
            )

        val writer =
            BufferedWriter(
                OutputStreamWriter(
                    output,
                    Charsets.UTF_8
                )
            )

        val status =
            when (statusCode) {

                400 ->
                    "Bad Request"

                404 ->
                    "Not Found"

                405 ->
                    "Method Not Allowed"

                503 ->
                    "Service Unavailable"

                else ->
                    "Error"
            }

        writer.write(
            "HTTP/1.1 $statusCode $status\r\n"
        )

        writer.write(
            "Content-Type: text/html; charset=utf-8\r\n"
        )

        writer.write(
            "Content-Length: ${bytes.size}\r\n"
        )

        writer.write(
            "Connection: close\r\n"
        )

        writer.write(
            "\r\n"
        )

        writer.flush()

        output.write(bytes)
        output.flush()
    }

    private fun escapeHtml(
        value: String
    ): String {

        return value
            .replace(
                "&",
                "&amp;"
            )
            .replace(
                "<",
                "&lt;"
            )
            .replace(
                ">",
                "&gt;"
            )
            .replace(
                "\"",
                "&quot;"
            )
            .replace(
                "'",
                "&#39;"
            )
    }

    private fun escapeJson(
        value: String
    ): String {

        return value
            .replace(
                "\\",
                "\\\\"
            )
            .replace(
                "\"",
                "\\\""
            )
            .replace(
                "\n",
                "\\n"
            )
            .replace(
                "\r",
                "\\r"
            )
    }

    private fun escapeHeader(
        value: String
    ): String {

        return value
            .replace(
                "\"",
                "'"
            )
            .replace(
                "\r",
                ""
            )
            .replace(
                "\n",
                ""
            )
    }

    private fun formatSize(
        bytes: Long
    ): String {

        if (bytes < 1024) {
            return "$bytes B"
        }

        if (
            bytes <
            1024L * 1024L
        ) {

            return "%.1f KB".format(
                bytes / 1024.0
            )
        }

        if (
            bytes <
            1024L *
            1024L *
            1024L
        ) {

            return "%.1f MB".format(
                bytes /
                    (
                        1024.0 *
                        1024.0
                    )
            )
        }

        return "%.2f GB".format(
            bytes /
                (
                    1024.0 *
                    1024.0 *
                    1024.0
                )
        )
    }

    fun createFile(
        uri: Uri,
        name: String,
        mimeType: String?,
        size: Long
    ): InternetSharedFile {

        return InternetSharedFile(
            id =
                UUID.randomUUID()
                    .toString(),

            uri = uri,

            name = name,

            mimeType = mimeType,

            size = size
        )
    }
}
