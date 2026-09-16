package com.muqaddas123.droplink.localshare

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

data class DiscoveredPeer(
    val name: String,
    val ip: String,
    val port: Int,
    val lastSeen: Long
)

class PeerDiscovery(
    private val context: Context,
    private val deviceName: String = Build.MODEL
) {
    companion object {
        private const val TAG = "DropLinkDiscovery"
        private const val DISCOVERY_PORT = 53317
        private const val BEACON_PREFIX = "DROPLINK_BEACON:"
    }

    private val discoveredPeers = ConcurrentHashMap<String, DiscoveredPeer>()
    private var socket: DatagramSocket? = null
    private var scheduler: ScheduledExecutorService? = null
    private var multicastLock: WifiManager.MulticastLock? = null
    @Volatile private var isRunning = false

    var onPeerFound: ((DiscoveredPeer) -> Unit)? = null
    var serverPort: Int = 8080

    fun start() {
        if (isRunning) return
        isRunning = true

        try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            multicastLock = wifiManager?.createMulticastLock("DropLinkPeerDiscovery")?.apply {
                setReferenceCounted(false)
                acquire()
            }
        } catch (e: Exception) {
            Log.w(TAG, "MulticastLock acquisition failed", e)
        }

        try {
            socket = DatagramSocket(null).apply {
                reuseAddress = true
                broadcast = true
                bind(InetSocketAddress(DISCOVERY_PORT))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to bind UDP socket on port $DISCOVERY_PORT", e)
            try {
                socket = DatagramSocket().apply { broadcast = true }
            } catch (_: Exception) {}
        }

        scheduler = Executors.newScheduledThreadPool(2)

        // 1. Broadcast presence beacon every 2.5 seconds
        scheduler?.scheduleWithFixedDelay({
            if (!isRunning) return@scheduleWithFixedDelay
            broadcastBeacon()
        }, 0, 2500, TimeUnit.MILLISECONDS)

        // 2. Listen for beacons
        scheduler?.execute {
            listenForBeacons()
        }

        Log.d(TAG, "Peer discovery started on port $DISCOVERY_PORT")
    }

    fun stop() {
        if (!isRunning) return
        isRunning = false

        try {
            scheduler?.shutdownNow()
            scheduler = null
        } catch (_: Exception) {}

        try {
            socket?.close()
            socket = null
        } catch (_: Exception) {}

        try {
            multicastLock?.let {
                if (it.isHeld) it.release()
            }
            multicastLock = null
        } catch (_: Exception) {}

        discoveredPeers.clear()
        Log.d(TAG, "Peer discovery stopped")
    }

    fun getPeers(): List<DiscoveredPeer> {
        val now = System.currentTimeMillis()
        // Filter out peers inactive for > 10 seconds
        return discoveredPeers.values.filter { now - it.lastSeen < 10000 }.toList()
    }

    private fun broadcastBeacon() {
        try {
            val myIp = NetworkUtils.getLocalIpAddress() ?: return
            val json = JSONObject().apply {
                put("name", deviceName)
                put("ip", myIp)
                put("port", serverPort)
                put("app", "droplink")
            }
            val payload = (BEACON_PREFIX + json.toString()).toByteArray(Charsets.UTF_8)

            // Send to limited broadcast and subnet broadcasts
            val broadcastAddresses = listOf(
                InetAddress.getByName("255.255.255.255"),
                InetAddress.getByName("192.168.43.255") // Standard Hotspot broadcast
            )

            for (addr in broadcastAddresses) {
                try {
                    val packet = DatagramPacket(payload, payload.size, addr, DISCOVERY_PORT)
                    socket?.send(packet)
                } catch (_: Exception) {}
            }
        } catch (e: Exception) {
            Log.w(TAG, "Beacon broadcast error", e)
        }
    }

    private fun listenForBeacons() {
        val buffer = ByteArray(2048)
        val myIp = NetworkUtils.getLocalIpAddress()

        while (isRunning) {
            try {
                val currentSocket = socket ?: break
                val packet = DatagramPacket(buffer, buffer.size)
                currentSocket.receive(packet)

                val senderIp = packet.address.hostAddress
                if (senderIp == myIp || senderIp == "127.0.0.1") continue

                val message = String(packet.data, 0, packet.length, Charsets.UTF_8).trim()
                if (message.startsWith(BEACON_PREFIX)) {
                    val jsonStr = message.removePrefix(BEACON_PREFIX)
                    val json = JSONObject(jsonStr)
                    val name = json.optString("name", "DropLink Device")
                    val port = json.optInt("port", 8080)
                    val reportedIp = json.optString("ip", senderIp)

                    val peer = DiscoveredPeer(
                        name = name,
                        ip = reportedIp,
                        port = port,
                        lastSeen = System.currentTimeMillis()
                    )
                    discoveredPeers[reportedIp] = peer
                    onPeerFound?.invoke(peer)
                }
            } catch (e: Exception) {
                if (isRunning) {
                    Log.d(TAG, "Receive error: ${e.message}")
                }
            }
        }
    }
}

