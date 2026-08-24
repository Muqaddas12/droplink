package com.muqaddas123.droplink

import android.net.Uri

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod


class DropLinkModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(
    reactContext
) {

    private var server:
        LocalHttpServer? = null


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

            if (
                files.size() == 0
            ) {

                promise.reject(
                    "NO_FILES",
                    "No files selected."
                )

                return
            }


            val sharedFiles =
                mutableListOf<SharedFile>()


            for (
                index in
                0 until files.size()
            ) {

                val item =
                    files.getMap(
                        index
                    )
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
                        item.hasKey(
                            "size"
                        ) &&
                        !item.isNull(
                            "size"
                        )
                    ) {

                        item.getDouble(
                            "size"
                        ).toLong()

                    } else {

                        0L
                    }


                sharedFiles.add(
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


            if (
                sharedFiles.isEmpty()
            ) {

                promise.reject(
                    "NO_VALID_FILES",
                    "No valid files were provided."
                )

                return
            }


            server?.stop()


            val newServer =
                LocalHttpServer(
                    reactContext
                        .contentResolver
                )


            newServer.setFiles(
                sharedFiles
            )


            val port =
                newServer.start()


            server =
                newServer


            val ip =
                NetworkUtils
                    .getLocalIpAddress()


            if (
                ip == null
            ) {

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


            promise.resolve(
                result
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
    // GET RECEIVED FILES
    // =========================================================

    @ReactMethod
    fun getReceivedFiles(
        promise: Promise
    ) {

        try {

            val currentServer =
                server


            if (
                currentServer == null
            ) {

                promise.resolve(
                    Arguments.createArray()
                )

                return
            }


            val files =
                currentServer
                    .getReceivedFiles()


            val result =
                Arguments.createArray()


            files.forEach { file ->

                val map =
                    Arguments.createMap()


                map.putString(
                    "name",
                    file.name
                )


                map.putString(
                    "mimeType",
                    file.mimeType
                )


                map.putDouble(
                    "size",
                    file.size.toDouble()
                )


                map.putString(
                    "path",
                    file.path
                )


                map.putString(
                    "category",
                    file.category
                )


                result.pushMap(
                    map
                )
            }


            promise.resolve(
                result
            )


        } catch (e: Exception) {

            promise.reject(
                "RECEIVED_FILES_ERROR",
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
                NetworkUtils
                    .getLocalIpAddress()


            if (
                ip == null
            ) {

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

    @ReactMethod
    fun getNetworkInfo(
        promise: Promise
    ) {

        try {

            val info =
                NetworkUtils
                    .getNetworkInfo(
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


    // =========================================================
    // INVALIDATE
    // =========================================================

    override fun invalidate() {

        server?.stop()

        server = null

        super.invalidate()
    }
}