package com.muqaddas123.droplink.localshare


import android.content.Context
import android.net.Uri
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DropLinkModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var server: LocalHttpServer? = null

    // =========================================================
    // NSD / mDNS
    // =========================================================

    private var nsdManager: NsdManager? = null
    private var nsdListener: NsdManager.RegistrationListener? = null

    private fun registerNsd(port: Int) {
        try {
            val mgr = reactContext.getSystemService(Context.NSD_SERVICE) as? NsdManager
                ?: return

            val listener = object : NsdManager.RegistrationListener {
                override fun onRegistrationFailed(si: NsdServiceInfo, code: Int) {}
                override fun onUnregistrationFailed(si: NsdServiceInfo, code: Int) {}
                override fun onServiceRegistered(si: NsdServiceInfo) {}
                override fun onServiceUnregistered(si: NsdServiceInfo) {}
            }

            val serviceInfo = NsdServiceInfo().apply {
                serviceName = "DropLink"
                serviceType = "_http._tcp."
                this.port   = port
            }

            mgr.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, listener)
            nsdManager = mgr
            nsdListener = listener
        } catch (_: Exception) {}
    }

    private fun unregisterNsd() {
        try {
            val listener = nsdListener ?: return
            nsdManager?.unregisterService(listener)
        } catch (_: Exception) {}
        nsdManager  = null
        nsdListener = null
    }

    override fun getName(): String {
        return "DropLink"
    }

    // =========================================================
    // START SERVER
    // =========================================================

    @ReactMethod
    fun startServer(
        files: ReadableArray,
        promise: Promise
    ) {

        try {

val sharedFiles =
                readableArrayToSharedFiles(
                    files
                )

/*
             * Stop only our existing Local Share server.
             *
             * Internet Share is completely separate
             * and is NOT touched here.
             */
            server?.stop()

            val newServer =
                LocalHttpServer(
                    reactContext.contentResolver,
                    android.os.Build.MODEL
                )

            newServer.setFiles(
                sharedFiles
            )

            val port =
                newServer.start()

            server =
                newServer

            val ip =
                NetworkUtils.getLocalIpAddress()

            if (ip == null) {

                newServer.stop()

                server = null

                promise.reject(
                    "NO_NETWORK",
                    "Unable to determine local IP address."
                )

                return
            }

            val url =
                "http://$ip:$port"

            // Register mDNS/NSD so iOS/Mac devices can discover "droplink.local"
            unregisterNsd()
            registerNsd(port)

            LocalShareNotification.show(
                reactContext,
                url
            )

            promise.resolve(
                createServerInfo(
                    ip = ip,
                    port = port,
                    url = url
                )
            )


        } catch (e: Exception) {

            promise.reject(
                "SERVER_START_ERROR",
                e.message,
                e
            )
        }
    }

    // =========================================================
    // ADD MORE FILES
    // =========================================================

    @ReactMethod
    fun addFiles(
        files: ReadableArray,
        promise: Promise
    ) {

        try {

            if (files.size() == 0) {

                promise.reject(
                    "NO_FILES",
                    "No files selected."
                )

                return
            }

            val currentServer =
                server

            if (
                currentServer == null ||
                !currentServer.isRunning()
            ) {

                promise.reject(
                    "SERVER_NOT_RUNNING",
                    "Local Share server is not running."
                )

                return
            }

            val newFiles =
                readableArrayToSharedFiles(
                    files
                )

            if (newFiles.isEmpty()) {

                promise.reject(
                    "NO_VALID_FILES",
                    "No valid files were provided."
                )

                return
            }

            /*
             * IMPORTANT:
             *
             * This does NOT stop or recreate the server.
             *
             * The same ServerSocket and same port
             * continue running.
             */
            currentServer.addFiles(
                newFiles
            )

            promise.resolve(
                createSharedFilesArray(
                    currentServer.getSharedFiles()
                )
            )

        } catch (e: Exception) {

            promise.reject(
                "ADD_FILES_ERROR",
                e.message,
                e
            )
        }
    }

    // =========================================================
    // GET SHARED FILES
    // =========================================================

    @ReactMethod
    fun getSharedFiles(
        promise: Promise
    ) {

        try {

            val currentServer =
                server

            if (currentServer == null) {

                promise.resolve(
                    Arguments.createArray()
                )

                return
            }

            promise.resolve(
                createSharedFilesArray(
                    currentServer.getSharedFiles()
                )
            )

        } catch (e: Exception) {

            promise.reject(
                "GET_SHARED_FILES_ERROR",
                e.message,
                e
            )
        }
    }

    // =========================================================
    // GET RECEIVED FILES
    // =========================================================

    @ReactMethod
    fun getReceivedFiles(
        promise: Promise
    ) {

        try {

            val currentServer =
                server

            if (currentServer == null) {

                promise.resolve(
                    Arguments.createArray()
                )

                return
            }

            promise.resolve(
                createReceivedFilesArray(
                    currentServer.getReceivedFiles()
                )
            )

        } catch (e: Exception) {

            promise.reject(
                "GET_RECEIVED_FILES_ERROR",
                e.message,
                e
            )
        }
    }

    // =========================================================
    // SCAN / REFRESH RECEIVED FILES
    // =========================================================

    /**
     * Scans Download/DropLink recursively and returns
     * all received files, including files received during
     * previous server sessions.
     *
     * This works even when the server is currently stopped.
     */
    @ReactMethod
    fun scanReceivedFiles(
        promise: Promise
    ) {

        try {

            val currentServer =
                server

            val files =
                if (
                    currentServer != null
                ) {

                    currentServer.scanReceivedFiles()

                } else {

                    /*
                     * The server may be stopped, but the
                     * received files still exist on disk.
                     *
                     * Create a temporary LocalHttpServer
                     * only for scanning the Download/DropLink
                     * directory. It is NOT started.
                     */
                    LocalHttpServer(
                        reactContext.contentResolver,
                        "DropLink device"
                    ).scanReceivedFiles()
                }

            promise.resolve(
                createReceivedFilesArray(
                    files
                )
            )

        } catch (e: Exception) {

            promise.reject(
                "SCAN_RECEIVED_FILES_ERROR",
                e.message,
                e
            )
        }
    }

    // =========================================================
    // GET SERVER STATUS
    // =========================================================

    @ReactMethod
    fun getServerStatus(
        promise: Promise
    ) {

        try {

            val currentServer =
                server

            val result =
                Arguments.createMap()

            if (
                currentServer == null ||
                !currentServer.isRunning()
            ) {

                result.putBoolean(
                    "running",
                    false
                )

                result.putInt(
                    "port",
                    0
                )

                result.putInt(
                    "sharedFileCount",
                    0
                )

                promise.resolve(
                    result
                )

                return
            }

            val ip =
                NetworkUtils.getLocalIpAddress()

            result.putBoolean(
                "running",
                true
            )

            result.putInt(
                "port",
                currentServer.port
            )

            if (ip != null) {

                result.putString(
                    "ip",
                    ip
                )

                result.putString(
                    "url",
                    "http://$ip:${currentServer.port}"
                )

            } else {

                result.putNull(
                    "ip"
                )

                result.putNull(
                    "url"
                )
            }

            result.putInt(
                "sharedFileCount",
                currentServer
                    .getSharedFiles()
                    .size
            )

            result.putInt(
                "receivedFileCount",
                currentServer
                    .getReceivedFiles()
                    .size
            )

            promise.resolve(
                result
            )

        } catch (e: Exception) {

            promise.reject(
                "SERVER_STATUS_ERROR",
                e.message,
                e
            )
        }
    }

    // =========================================================
    // STOP SERVER
    // =========================================================

    @ReactMethod
    fun stopServer(
        promise: Promise
    ) {

        try {

            server?.stop()

            unregisterNsd()

            LocalShareNotification.clear(
                reactContext
            )

            server = null

            promise.resolve(
                true
            )

        } catch (e: Exception) {

            promise.reject(
                "SERVER_STOP_ERROR",
                e.message,
                e
            )
        }
    }

    // =========================================================
    // LOCAL IP
    // =========================================================

    @ReactMethod
    fun getLocalIp(
        promise: Promise
    ) {

        try {

            val ip =
                NetworkUtils.getLocalIpAddress()

            if (ip == null) {

                promise.reject(
                    "NO_NETWORK",
                    "Unable to determine local IP address."
                )

                return
            }

            promise.resolve(
                ip
            )

        } catch (e: Exception) {

            promise.reject(
                "IP_ERROR",
                e.message,
                e
            )
        }
    }

    // =========================================================
    // NETWORK INFO
    // =========================================================

    /*
     * Keeping this method because it already exists in
     * your Local Share API.
     *
     * The new UI simply won't display the Network Status card.
     */
    @ReactMethod
    fun getNetworkInfo(
        promise: Promise
    ) {

        try {

            val info =
                NetworkUtils.getNetworkInfo(
                    reactContext
                )

            val result =
                Arguments.createMap()

            result.putBoolean(
                "connected",
                info.connected
            )

            if (
                info.ip != null
            ) {

                result.putString(
                    "ip",
                    info.ip
                )

            } else {

                result.putNull(
                    "ip"
                )
            }

            result.putString(
                "type",
                info.type
            )

            promise.resolve(
                result
            )

        } catch (e: Exception) {

            promise.reject(
                "NETWORK_INFO_ERROR",
                e.message,
                e
            )
        }
    }

    // CONVERT READABLE ARRAY → SHARED FILES
    // =========================================================

    private fun readableArrayToSharedFiles(
        files: ReadableArray
    ): List<SharedFile> {

        val result =
            mutableListOf<SharedFile>()

        for (
            index in 0 until files.size()
        ) {

            val item =
                files.getMap(index)
                    ?: continue

            val uriString =
                item.getString(
                    "uri"
                )
                    ?: continue

            val name =
                item.getString(
                    "name"
                )
                    ?: "Unknown File"

            val mimeType =
                item.getString(
                    "mimeType"
                )

            val size =
                if (
                    item.hasKey("size") &&
                    !item.isNull("size")
                ) {

                    item
                        .getDouble("size")
                        .toLong()

                } else {

                    0L
                }

            result.add(
                SharedFile(
                    uri =
                        Uri.parse(
                            uriString
                        ),

                    name =
                        name,

                    mimeType =
                        mimeType,

                    size =
                        size
                )
            )
        }

        return result
    }

    // =========================================================
    // SERVER INFO
    // =========================================================

    private fun createServerInfo(
        ip: String,
        port: Int,
        url: String
    ) = Arguments.createMap().apply {

        putString(
            "ip",
            ip
        )

        putInt(
            "port",
            port
        )

        putString(
            "url",
            url
        )

        // Friendly mDNS name (resolves natively on iOS/macOS Safari)
        putString(
            "mdnsName",
            "droplink.local"
        )
    }

    // =========================================================
    // SHARED FILES → RN ARRAY
    // =========================================================

    private fun createSharedFilesArray(
        files: List<SharedFile>
    ) = Arguments.createArray().apply {

        files.forEachIndexed {
            index,
            file ->

            pushMap(
                Arguments.createMap().apply {

                    putInt(
                        "index",
                        index
                    )

                    putString(
                        "uri",
                        file.uri.toString()
                    )

                    putString(
                        "name",
                        file.name
                    )

                    if (
                        file.mimeType != null
                    ) {

                        putString(
                            "mimeType",
                            file.mimeType
                        )

                    } else {

                        putNull(
                            "mimeType"
                        )
                    }

                    putDouble(
                        "size",
                        file.size.toDouble()
                    )

                    putInt(
                        "downloadCount",
                        file.downloadCount
                    )
                }
            )
        }
    }

    // =========================================================
    // RECEIVED FILES → RN ARRAY
    // =========================================================

    private fun createReceivedFilesArray(
        files: List<ReceivedFile>
    ) = Arguments.createArray().apply {

        files.forEach { file ->

            pushMap(
                Arguments.createMap().apply {

                    putString(
                        "name",
                        file.name
                    )

                    putString(
                        "mimeType",
                        file.mimeType
                    )

                    putDouble(
                        "size",
                        file.size.toDouble()
                    )

                    putString(
                        "path",
                        file.path
                    )

                    putString(
                        "category",
                        file.category
                    )
                }
            )
        }
    }

    // =========================================================
    // INVALIDATE
    // =========================================================

    override fun invalidate() {

        server?.stop()

        unregisterNsd()

        LocalShareNotification.clear(
            reactContext
        )

        server = null

        super.invalidate()
    }
}
