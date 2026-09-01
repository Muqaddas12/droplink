package com.muqaddas123.droplink.internetshare

import android.content.Context
import java.net.Inet4Address
import java.net.Inet6Address
import java.net.InetAddress
import java.net.NetworkInterface

data class NetworkInfo(
    val connected: Boolean,
    val ip: String?,
    val type: String
)

object NetworkUtils {

    fun getNetworkInfo(
        context: Context
    ): NetworkInfo {
        val network = getPreferredAddress()
        if (network != null) {
            return NetworkInfo(
                connected = true,
                ip = cleanHostAddress(network.address),
                type = network.type
            )
        }

        return NetworkInfo(
            connected = false,
            ip = null,
            type = "None"
        )
    }

    /**
     * Local network address (prefer IPv4 on Wi-Fi/Hotspot/Ethernet)
     */
    fun getLocalNetworkAddress(): NetworkAddress? {
        val candidates = getIpCandidates()

        // 1. Wi-Fi / Hotspot IPv4
        val wifiIpv4 = candidates.firstOrNull {
            isLocalInterface(it) &&
                it.address is Inet4Address &&
                !it.address.isLoopbackAddress &&
                !it.address.isLinkLocalAddress
        }
        if (wifiIpv4 != null) return wifiIpv4

        // 2. Ethernet IPv4
        val ethIpv4 = candidates.firstOrNull {
            isEthernetInterface(it) &&
                it.address is Inet4Address &&
                !it.address.isLoopbackAddress &&
                !it.address.isLinkLocalAddress
        }
        if (ethIpv4 != null) return ethIpv4

        // 3. Wi-Fi / Hotspot IPv6
        val wifiIpv6 = candidates.firstOrNull {
            isLocalInterface(it) &&
                it.address is Inet6Address &&
                isUsableIpv6(it.address as Inet6Address)
        }
        if (wifiIpv6 != null) return wifiIpv6

        // 4. Any other non-cellular IPv4
        val otherIpv4 = candidates.firstOrNull {
            it.type != "Cellular" &&
                it.address is Inet4Address &&
                !it.address.isLoopbackAddress &&
                !it.address.isLinkLocalAddress
        }
        if (otherIpv4 != null) return otherIpv4

        return null
    }

    /**
     * Internet Share address.
     * Searches across Wi-Fi, Cellular, Hotspot, and all active interfaces.
     */
    fun getInternetNetworkAddress(): NetworkAddress? {
        val candidates = getIpCandidates()
        if (candidates.isEmpty()) return null

        // 1. Wi-Fi / Hotspot IPv4 (best for browser direct access on same router/hotspot)
        val wifiIpv4 = candidates.firstOrNull {
            isLocalInterface(it) &&
                it.address is Inet4Address &&
                !it.address.isLoopbackAddress &&
                !it.address.isLinkLocalAddress
        }
        if (wifiIpv4 != null) return wifiIpv4

        // 2. Usable IPv6 on Wi-Fi (often globally routable)
        val wifiIpv6 = candidates.firstOrNull {
            isLocalInterface(it) &&
                it.address is Inet6Address &&
                isUsableIpv6(it.address as Inet6Address)
        }
        if (wifiIpv6 != null) return wifiIpv6

        // 3. Cellular IPv6 (globally routable on 4G/5G mobile data)
        val cellIpv6 = candidates.firstOrNull {
            it.type == "Cellular" &&
                it.address is Inet6Address &&
                isUsableIpv6(it.address as Inet6Address)
        }
        if (cellIpv6 != null) return cellIpv6

        // 4. Cellular IPv4 (mobile hotspot / carrier)
        val cellIpv4 = candidates.firstOrNull {
            it.type == "Cellular" &&
                it.address is Inet4Address &&
                !it.address.isLoopbackAddress &&
                !it.address.isLinkLocalAddress
        }
        if (cellIpv4 != null) return cellIpv4

        // 5. Ethernet IPv4
        val ethIpv4 = candidates.firstOrNull {
            isEthernetInterface(it) &&
                it.address is Inet4Address &&
                !it.address.isLoopbackAddress &&
                !it.address.isLinkLocalAddress
        }
        if (ethIpv4 != null) return ethIpv4

        // 6. Any other IPv4 candidate
        val anyIpv4 = candidates.firstOrNull {
            it.address is Inet4Address &&
                !it.address.isLoopbackAddress &&
                !it.address.isLinkLocalAddress
        }
        if (anyIpv4 != null) return anyIpv4

        // 7. Any other IPv6 candidate
        val anyIpv6 = candidates.firstOrNull {
            it.address is Inet6Address &&
                isUsableIpv6(it.address as Inet6Address)
        }
        if (anyIpv6 != null) return anyIpv6

        return candidates.firstOrNull()
    }

    fun getPreferredAddress(): NetworkAddress? {
        return getInternetNetworkAddress() ?: getLocalNetworkAddress() ?: getIpCandidates().firstOrNull()
    }

    fun getLocalIpAddress(): String? {
        val addr = getLocalNetworkAddress() ?: getPreferredAddress()
        return addr?.let { cleanHostAddress(it.address) }
    }

    fun cleanHostAddress(address: InetAddress): String {
        val raw = address.hostAddress ?: ""
        return if (raw.contains("%")) {
            raw.substringBefore("%")
        } else {
            raw
        }
    }

    private fun isLocalInterface(network: NetworkAddress): Boolean {
        val name = network.interfaceName.lowercase()
        return name.contains("wlan") ||
            name.contains("wifi") ||
            name.contains("ap") ||
            name.contains("swlan") ||
            name.contains("wl") ||
            name.contains("hotspot") ||
            name.contains("softap")
    }

    private fun isEthernetInterface(network: NetworkAddress): Boolean {
        val name = network.interfaceName.lowercase()
        return name.contains("eth") || name.contains("usb") || name.contains("rndis")
    }

    private fun getIpCandidates(): List<NetworkAddress> {
        val result = mutableListOf<NetworkAddress>()
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return result
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                if (!iface.isUp || iface.isLoopback) continue

                val type = getInterfaceType(iface.name)
                val addresses = iface.inetAddresses

                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (address.isLoopbackAddress || address.isLinkLocalAddress || address.isMulticastAddress) {
                        continue
                    }

                    if (address is Inet6Address && !isUsableIpv6(address)) {
                        continue
                    }

                    result.add(
                        NetworkAddress(
                            address = address,
                            type = type,
                            interfaceName = iface.name
                        )
                    )
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("DropLinkNetwork", "Error scanning network interfaces", e)
        }
        return result
    }

    private fun isUsableIpv6(address: Inet6Address): Boolean {
        return !address.isLoopbackAddress &&
            !address.isLinkLocalAddress &&
            !address.isSiteLocalAddress &&
            !address.isMulticastAddress
    }

    private fun getInterfaceType(name: String): String {
        val lower = name.lowercase()
        return when {
            lower.contains("rmnet") || lower.contains("ccmni") || lower.contains("pdp") || lower.contains("data") || lower.contains("radio") || lower.contains("cellular") -> "Cellular"
            lower.contains("wlan") || lower.contains("wifi") || lower.contains("swlan") || lower.contains("wl") -> "WiFi"
            lower.contains("ap") || lower.contains("hotspot") || lower.contains("softap") -> "Hotspot"
            lower.contains("eth") || lower.contains("usb") || lower.contains("rndis") -> "Ethernet"
            else -> "LAN"
        }
    }
}

data class NetworkAddress(
    val address: InetAddress,
    val type: String,
    val interfaceName: String
)