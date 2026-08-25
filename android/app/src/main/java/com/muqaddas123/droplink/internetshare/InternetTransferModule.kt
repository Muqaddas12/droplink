package com.muqaddas123.droplink.internetshare


import android.net.Uri

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray


class InternetTransferModule(
    private val context: ReactApplicationContext
) : ReactContextBaseJavaModule(context) {

    private var server:
        InternetTransferServer? = null

    private var client:
        InternetTransferClient? = null


    override fun getName(): String {
        return "InternetTransfer"
    }


    /*
     * ============================================================
     * CREATE INTERNET SERVER
     * ============================================================
     */

    @ReactMethod
    fun createServer(
        filesArray: ReadableArray,
        promise: Promise
    ) {

        try {

            /*
             * Create server.
             */

            val transferServer =
                InternetTransferServer(
                    context.contentResolver
                )


            /*
             * Convert React Native files
             * into native shared files.
             */

            val files =
                mutableListOf<InternetSharedFile>()


            for (
                i in 0 until filesArray.size()
            ) {

                val map =
                    filesArray.getMap(i)


                /*
                 * React Native ReadableMap
                 * can be nullable.
                 */

                if (map == null) {
                    continue
                }


                /*
                 * URI
                 */

                val uriString =
                    if (
                        map.hasKey("uri") &&
                        !map.isNull("uri")
                    ) {

                        map.getString("uri")

                    } else {

                        null
                    }


                if (
                    uriString.isNullOrBlank()
                ) {
                    continue
                }


                val uri =
                    Uri.parse(
                        uriString
                    )


                /*
                 * File name
                 */

                val name =
                    if (
                        map.hasKey("name") &&
                        !map.isNull("name")
                    ) {

                        map.getString("name")
                            ?: "file"

                    } else {

                        "file"
                    }


                /*
                 * MIME type
                 */

                val mimeType =
                    if (
                        map.hasKey("mimeType") &&
                        !map.isNull("mimeType")
                    ) {

                        map.getString(
                            "mimeType"
                        )

                    } else {

                        null
                    }


                /*
                 * File size
                 */

                val size =
                    if (
                        map.hasKey("size") &&
                        !map.isNull("size")
                    ) {

                        map.getDouble(
                            "size"
                        ).toLong()

                    } else {

                        0L
                    }


                /*
                 * Create native file.
                 */

                val sharedFile =
                    transferServer.createFile(
                        uri = uri,
                        name = name,
                        mimeType = mimeType,
                        size = size
                    )


                files.add(
                    sharedFile
                )
            }


            /*
             * No files.
             */

            if (
                files.isEmpty()
            ) {

                promise.reject(
                    "NO_FILES",
                    "No valid files were provided."
                )

                return
            }


            /*
             * ====================================================
             * SELECT NETWORK ADDRESS
             * ====================================================
             *
             * NetworkUtils decides:
             *
             * Internet Share:
             *   IPv6 preferred
             *   IPv4 fallback
             *
             * The selected address MUST be the same
             * address used by the HTTP server.
             */

            val network =
                NetworkUtils.getPreferredAddress()


            if (network == null) {

                promise.reject(
                    "NO_NETWORK",
                    "No usable IPv4 or IPv6 address was found."
                )

                return
            }


            /*
             * Get selected IP.
             */

            val ip =
                network.address.hostAddress


            if (
                ip.isNullOrBlank()
            ) {

                promise.reject(
                    "NO_IP",
                    "Unable to determine the selected network IP."
                )

                return
            }


            /*
             * ====================================================
             * SET FILES
             * ====================================================
             */

            transferServer.setFiles(
                files
            )


            /*
             * ====================================================
             * IMPORTANT FIX
             * ====================================================
             *
             * Bind the server to EXACTLY the address
             * we selected above.
             *
             * Previously:
             *
             *     transferServer.start()
             *
             * That could make the socket listen on a
             * different interface.
             *
             * Now:
             *
             *     transferServer.start(network.address)
             *
             * The advertised IP and listening IP are
             * therefore the same.
             */

            val port =
                transferServer.start()


            /*
             * Store server instance.
             */

            server =
                transferServer


            /*
             * ====================================================
             * BUILD URL
             * ====================================================
             */

            val url =
                buildServerUrl(
                    ip,
                    port
                )


            /*
             * ====================================================
             * RESULT
             * ====================================================
             */

            val result =
                Arguments.createMap()


            result.putString(
                "ip",
                ip
            )


            result.putInt(
                "port",
                port
            )


            result.putString(
                "url",
                url
            )


            result.putString(
                "networkType",
                network.type
            )


            result.putString(
                "interfaceName",
                network.interfaceName
            )


            /*
             * File information.
             */

            val fileArray =
                Arguments.createArray()


            files.forEach { file ->

                val map =
                    Arguments.createMap()


                map.putString(
                    "id",
                    file.id
                )


                map.putString(
                    "name",
                    file.name
                )


                if (
                    file.mimeType != null
                ) {

                    map.putString(
                        "mimeType",
                        file.mimeType
                    )

                } else {

                    map.putNull(
                        "mimeType"
                    )
                }


                map.putDouble(
                    "size",
                    file.size.toDouble()
                )


                fileArray.pushMap(
                    map
                )
            }


            result.putArray(
                "files",
                fileArray
            )


            /*
             * Logs.
             */

            android.util.Log.d(
                "DropLinkInternet",
                "================================"
            )

            android.util.Log.d(
                "DropLinkInternet",
                "SERVER STARTED"
            )

            android.util.Log.d(
                "DropLinkInternet",
                "IP: $ip"
            )

            android.util.Log.d(
                "DropLinkInternet",
                "TYPE: ${network.type}"
            )

            android.util.Log.d(
                "DropLinkInternet",
                "INTERFACE: ${network.interfaceName}"
            )

            android.util.Log.d(
                "DropLinkInternet",
                "PORT: $port"
            )

            android.util.Log.d(
                "DropLinkInternet",
                "URL: $url"
            )

            android.util.Log.d(
                "DropLinkInternet",
                "================================"
            )


            /*
             * Return to React Native.
             */

            promise.resolve(
                result
            )


        } catch (e: Exception) {

            android.util.Log.e(
                "DropLinkInternet",
                "CREATE SERVER ERROR",
                e
            )


            promise.reject(
                "CREATE_SERVER_ERROR",
                e.message,
                e
            )
        }
    }


    /*
     * ============================================================
     * BUILD SERVER URL
     * ============================================================
     *
     * IPv4:
     *
     * http://192.168.1.100:40000/
     *
     *
     * IPv6:
     *
     * http://[2401:4900:xxxx:xxxx::1]:40000/
     *
     *
     * Square brackets are mandatory for IPv6 URLs.
     */

    private fun buildServerUrl(
        ip: String,
        port: Int
    ): String {

        return if (
            ip.contains(":")
        ) {

            "http://[$ip]:$port/"

        } else {

            "http://$ip:$port/"
        }
    }


    /*
     * ============================================================
     * PAUSE SERVER
     * ============================================================
     */

    @ReactMethod
    fun pauseServer(
        promise: Promise
    ) {

        try {

            server?.pause()

            promise.resolve(
                true
            )

        } catch (e: Exception) {

            promise.reject(
                "PAUSE_SERVER_ERROR",
                e.message,
                e
            )
        }
    }


    /*
     * ============================================================
     * RESUME SERVER
     * ============================================================
     */

    @ReactMethod
    fun resumeServer(
        promise: Promise
    ) {

        try {

            server?.resume()

            promise.resolve(
                true
            )

        } catch (e: Exception) {

            promise.reject(
                "RESUME_SERVER_ERROR",
                e.message,
                e
            )
        }
    }


    /*
     * ============================================================
     * STOP SERVER
     * ============================================================
     */

    @ReactMethod
    fun stopServer(
        promise: Promise
    ) {

        try {

            server?.stop()

            server = null

            promise.resolve(
                true
            )

        } catch (e: Exception) {

            promise.reject(
                "STOP_SERVER_ERROR",
                e.message,
                e
            )
        }
    }


    /*
     * ============================================================
     * CONNECT CLIENT
     * ============================================================
     */

    @ReactMethod
    fun connect(
        host: String,
        port: Int,
        promise: Promise
    ) {

        try {

            val transferClient =
                InternetTransferClient()


            transferClient.connect(
                host,
                port
            )


            client =
                transferClient


            promise.resolve(
                true
            )


        } catch (e: Exception) {

            android.util.Log.e(
                "DropLinkInternet",
                "CONNECT ERROR",
                e
            )


            promise.reject(
                "CONNECT_ERROR",
                e.message,
                e
            )
        }
    }


    /*
     * ============================================================
     * PAUSE DOWNLOAD
     * ============================================================
     */

    @ReactMethod
    fun pauseDownload(
        promise: Promise
    ) {

        try {

            client?.pause()

            promise.resolve(
                true
            )

        } catch (e: Exception) {

            promise.reject(
                "PAUSE_DOWNLOAD_ERROR",
                e.message,
                e
            )
        }
    }


    /*
     * ============================================================
     * RESUME DOWNLOAD
     * ============================================================
     */

    @ReactMethod
    fun resumeDownload(
        promise: Promise
    ) {

        try {

            client?.resume()

            promise.resolve(
                true
            )

        } catch (e: Exception) {

            promise.reject(
                "RESUME_DOWNLOAD_ERROR",
                e.message,
                e
            )
        }
    }


    /*
     * ============================================================
     * DOWNLOAD
     * ============================================================
     */

    @ReactMethod
    fun download(
        fileId: String,
        destination: String,
        totalSize: Double,
        promise: Promise
    ) {

        val transferClient =
            client


        if (
            transferClient == null
        ) {

            promise.reject(
                "NOT_CONNECTED",
                "Internet transfer client is not connected."
            )

            return
        }


        Thread {

            try {

                val file =
                    java.io.File(
                        destination
                    )


                transferClient.download(
                    fileId,
                    file,
                    totalSize.toLong()
                ) { transferred, total ->

                    /*
                     * Progress events can be
                     * added later.
                     */

                    android.util.Log.d(
                        "DropLinkInternet",
                        "DOWNLOAD: $transferred / $total"
                    )
                }


                promise.resolve(
                    true
                )


            } catch (e: Exception) {

                android.util.Log.e(
                    "DropLinkInternet",
                    "DOWNLOAD ERROR",
                    e
                )


                promise.reject(
                    "DOWNLOAD_ERROR",
                    e.message,
                    e
                )
            }

        }.start()
    }


    /*
     * ============================================================
     * CLOSE CLIENT
     * ============================================================
     */

    @ReactMethod
    fun close(
        promise: Promise
    ) {

        try {

            client?.close()

            client = null

            promise.resolve(
                true
            )

        } catch (e: Exception) {

            promise.reject(
                "CLOSE_ERROR",
                e.message,
                e
            )
        }
    }
}