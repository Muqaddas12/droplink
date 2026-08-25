        package com.muqaddas123.droplink.internetshare

        import java.io.BufferedInputStream
        import java.io.BufferedOutputStream
        import java.io.DataInputStream
        import java.io.DataOutputStream
        import java.io.File
        import java.net.Socket

        class InternetTransferClient {

            companion object {

                private const val CMD_INFO = 1
                private const val CMD_REQUEST_CHUNK = 2
                private const val CMD_CLOSE = 5

                private const val RESPONSE_INFO = 101
                private const val RESPONSE_CHUNK = 102
                private const val RESPONSE_ERROR = 199

                private const val CHUNK_SIZE = 1024 * 1024
            }

            private var socket: Socket? = null

            private var input:
                DataInputStream? = null

            private var output:
                DataOutputStream? = null

            @Volatile
            var paused = false
                private set

            fun connect(
                host: String,
                port: Int
            ) {

                socket =
                    Socket(
                        host,
                        port
                    )

                input =
                    DataInputStream(
                        BufferedInputStream(
                            socket!!.getInputStream()
                        )
                    )

                output =
                    DataOutputStream(
                        BufferedOutputStream(
                            socket!!.getOutputStream()
                        )
                    )
            }

            fun pause() {
                paused = true
            }

            fun resume() {
                paused = false
            }

            fun close() {

                try {

                    output?.writeInt(
                        CMD_CLOSE
                    )

                    output?.flush()

                } catch (_: Exception) {
                }

                try {
                    socket?.close()
                } catch (_: Exception) {
                }

                socket = null
                input = null
                output = null
            }

            fun download(
                fileId: String,
                destination: File,
                totalSize: Long,
                onProgress: (
                    Long,
                    Long
                ) -> Unit
            ) {

                val inputStream =
                    input
                        ?: throw IllegalStateException(
                            "Not connected"
                        )

                val outputStream =
                    output
                        ?: throw IllegalStateException(
                            "Not connected"
                        )

                /*
                * Resume from existing file size.
                */
                var offset =
                    if (destination.exists()) {
                        destination.length()
                    } else {
                        0L
                    }

                destination.parentFile?.mkdirs()

                val randomAccessFile =
                    java.io.RandomAccessFile(
                        destination,
                        "rw"
                    )

                randomAccessFile.use { file ->

                    file.setLength(
                        totalSize
                    )

                    while (
                        offset < totalSize
                    ) {

                        /*
                        * Pause without losing progress.
                        */
                        while (paused) {
                            Thread.sleep(100)
                        }

                        val requestLength =
                            minOf(
                                CHUNK_SIZE.toLong(),
                                totalSize - offset
                            ).toInt()

                        /*
                        * Request a specific chunk.
                        */
                        outputStream.writeInt(
                            CMD_REQUEST_CHUNK
                        )

                        outputStream.writeUTF(
                            fileId
                        )

                        outputStream.writeLong(
                            offset
                        )

                        outputStream.writeInt(
                            requestLength
                        )

                        outputStream.flush()

                        val response =
                            inputStream.readInt()

                        if (
                            response ==
                            RESPONSE_ERROR
                        ) {

                            val message =
                                inputStream.readUTF()

                            throw Exception(
                                message
                            )
                        }

                        if (
                            response !=
                            RESPONSE_CHUNK
                        ) {

                            throw Exception(
                                "Invalid server response"
                            )
                        }

                        val chunkOffset =
                            inputStream.readLong()

                        val chunkLength =
                            inputStream.readInt()

                        if (
                            chunkOffset != offset
                        ) {

                            throw Exception(
                                "Invalid chunk offset"
                            )
                        }

                        if (
                            chunkLength <= 0 ||
                            chunkLength > requestLength
                        ) {

                            throw Exception(
                                "Invalid chunk size"
                            )
                        }

                        val buffer =
                            ByteArray(
                                chunkLength
                            )

                        inputStream.readFully(
                            buffer
                        )

                        /*
                        * Write directly at the correct
                        * position.
                        */
                        file.seek(
                            chunkOffset
                        )

                        file.write(
                            buffer
                        )

                        offset +=
                            chunkLength

                        onProgress(
                            offset,
                            totalSize
                        )
                    }
                }
            }
        }