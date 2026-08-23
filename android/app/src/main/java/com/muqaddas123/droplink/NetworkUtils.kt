package com.muqaddas123.droplink

import android.content.Context
import java.net.Inet4Address
import java.net.Inet6Address
import java.net.NetworkInterface

data class NetworkInfo(
    val connected: Boolean,
    val ip: String?,
    val type: String
)

object NetworkUtils {

    /*
     * =========================================================
     * GENERAL NETWORK INFO
     * =========================================================
     *
     * Used when the app simply wants to know
     * whether some usable network exists.
     *
     * This uses Internet preference.
     */
    fun getNetworkInfo(
        context: Context
    ): NetworkInfo {

        val network =
            getInternetNetworkAddress()

        if (network != null) {

            return NetworkInfo(
                connected = true,
                ip = network.address.hostAddress,
                type = network.type
            )
        }

        /*
         * If Internet address isn't available,
         * check local network.
         */
        val local =
            getLocalNetworkAddress()

        if (local != null) {

            return NetworkInfo(
                connected = true,
                ip = local.address.hostAddress,
                type = local.type
            )
        }

        return NetworkInfo(
            connected = false,
            ip = null,
            type = "Unknown"
        )
    }


    /*
     * =========================================================
     * LOCAL SHARE
     * =========================================================
     *
     * Use this ONLY for Local Share.
     *
     * Allowed:
     *
     *   wlan
     *   wifi
     *   ap
     *   eth
     *
     * NEVER:
     *
     *   rmnet
     *   cellular
     *
     * Preference:
     *
     *   1. Wi-Fi/Hotspot IPv4
     *   2. Wi-Fi/Hotspot IPv6
     *   3. Ethernet IPv4
     *   4. Ethernet IPv6
     */
    fun getLocalNetworkAddress():
        NetworkAddress? {

        val candidates =
            getIpCandidates()


        /*
         * 1. Wi-Fi / Hotspot IPv4
         */

        val wifiIpv4 =
            candidates.firstOrNull {

                isLocalInterface(it) &&

                it.address is Inet4Address &&

                !it.address.isLoopbackAddress &&

                !it.address.isLinkLocalAddress
            }

        if (wifiIpv4 != null) {

            android.util.Log.d(
                "DropLinkNetwork",
                "LOCAL SHARE IPv4: " +
                    wifiIpv4.address.hostAddress +
                    " INTERFACE: " +
                    wifiIpv4.interfaceName
            )

            return wifiIpv4
        }


        /*
         * 2. Wi-Fi / Hotspot IPv6
         */

        val wifiIpv6 =
            candidates.firstOrNull {

                isLocalInterface(it) &&

                it.address is Inet6Address &&

                isUsableIpv6(
                    it.address as Inet6Address
                )
            }

        if (wifiIpv6 != null) {

            android.util.Log.d(
                "DropLinkNetwork",
                "LOCAL SHARE IPv6: " +
                    wifiIpv6.address.hostAddress +
                    " INTERFACE: " +
                    wifiIpv6.interfaceName
            )

            return wifiIpv6
        }


        /*
         * 3. Ethernet IPv4
         */

        val ethernetIpv4 =
            candidates.firstOrNull {

                isEthernetInterface(it) &&

                it.address is Inet4Address &&

                !it.address.isLoopbackAddress &&

                !it.address.isLinkLocalAddress
            }

        if (ethernetIpv4 != null) {

            android.util.Log.d(
                "DropLinkNetwork",
                "LOCAL SHARE Ethernet IPv4: " +
                    ethernetIpv4.address.hostAddress +
                    " INTERFACE: " +
                    ethernetIpv4.interfaceName
            )

            return ethernetIpv4
        }


        /*
         * 4. Ethernet IPv6
         */

        val ethernetIpv6 =
            candidates.firstOrNull {

                isEthernetInterface(it) &&

                it.address is Inet6Address &&

                isUsableIpv6(
                    it.address as Inet6Address
                )
            }

        if (ethernetIpv6 != null) {

            android.util.Log.d(
                "DropLinkNetwork",
                "LOCAL SHARE Ethernet IPv6: " +
                    ethernetIpv6.address.hostAddress +
                    " INTERFACE: " +
                    ethernetIpv6.interfaceName
            )

            return ethernetIpv6
        }


        /*
         * DO NOT FALL BACK TO CELLULAR.
         */

        android.util.Log.d(
            "DropLinkNetwork",
            "LOCAL SHARE: No Wi-Fi, Hotspot or Ethernet"
        )

        return null
    }


    /*
     * =========================================================
     * INTERNET SHARE
     * =========================================================
     *
     * Use this ONLY for Internet Share.
     *
     * Preference:
     *
     *   1. rmnet_data1 IPv6
     *   2. Other cellular IPv6
     *
     * We intentionally do NOT use Wi-Fi here as a fallback.
     *
     * Internet Share is intended to expose the address
     * reachable through the Internet.
     */
    fun getInternetNetworkAddress():
        NetworkAddress? {

        val candidates =
            getIpCandidates()


        /*
         * 1. Preferred cellular interface:
         *    rmnet_data1 IPv6
         */

        val rmnetData1 =
            candidates.firstOrNull {

                it.interfaceName.equals(
                    "rmnet_data1",
                    ignoreCase = true
                ) &&

                it.type == "Cellular" &&

                it.address is Inet6Address &&

                isUsableIpv6(
                    it.address as Inet6Address
                )
            }

        if (rmnetData1 != null) {

            android.util.Log.d(
                "DropLinkNetwork",
                "INTERNET SHARE rmnet_data1 IPv6: " +
                    rmnetData1.address.hostAddress
            )

            return rmnetData1
        }


        /*
         * 2. Any other cellular IPv6
         */

        val cellularIpv6 =
            candidates.firstOrNull {

                it.type == "Cellular" &&

                it.address is Inet6Address &&

                isUsableIpv6(
                    it.address as Inet6Address
                )
            }

        if (cellularIpv6 != null) {

            android.util.Log.d(
                "DropLinkNetwork",
                "INTERNET SHARE Cellular IPv6: " +
                    cellularIpv6.address.hostAddress +
                    " INTERFACE: " +
                    cellularIpv6.interfaceName
            )

            return cellularIpv6
        }


        /*
         * 3. Cellular IPv4 fallback.
         *
         * Note:
         * Many mobile carriers use CGNAT, so this address
         * may NOT be reachable directly from the Internet.
         *
         * It is returned only as a fallback.
         */

        val cellularIpv4 =
            candidates.firstOrNull {

                it.type == "Cellular" &&

                it.address is Inet4Address &&

                !it.address.isLoopbackAddress &&

                !it.address.isLinkLocalAddress
            }

        if (cellularIpv4 != null) {

            android.util.Log.d(
                "DropLinkNetwork",
                "INTERNET SHARE Cellular IPv4: " +
                    cellularIpv4.address.hostAddress
            )

            return cellularIpv4
        }


        android.util.Log.d(
            "DropLinkNetwork",
            "INTERNET SHARE: No usable Internet address"
        )

        return null
    }


    /*
     * =========================================================
     * COMPATIBILITY METHOD
     * =========================================================
     *
     * If old Local Share code still calls:
     *
     *     NetworkUtils.getLocalIpAddress()
     *
     * it will now get the LOCAL address.
     *
     * It will NOT return rmnet/cellular.
     */
    fun getLocalIpAddress(): String? {

        return getLocalNetworkAddress()
            ?.address
            ?.hostAddress
    }


    /*
     * =========================================================
     * LOCAL INTERFACE CHECK
     * =========================================================
     */
    private fun isLocalInterface(
        network: NetworkAddress
    ): Boolean {

        val name =
            network.interfaceName
                .lowercase()

        return name.contains("wlan") ||
                name.contains("wifi") ||
                name.contains("ap")
    }


    /*
     * =========================================================
     * ETHERNET CHECK
     * =========================================================
     */
    private fun isEthernetInterface(
        network: NetworkAddress
    ): Boolean {

        return network.interfaceName
            .lowercase()
            .contains("eth")
    }


    /*
     * =========================================================
     * GET ALL IP CANDIDATES
     * =========================================================
     */
    private fun getIpCandidates():
        List<NetworkAddress> {

        val result =
            mutableListOf<NetworkAddress>()

        try {

            val interfaces =
                NetworkInterface
                    .getNetworkInterfaces()

            while (
                interfaces.hasMoreElements()
            ) {

                val networkInterface =
                    interfaces.nextElement()


                /*
                 * Ignore disabled interfaces.
                 */

                if (
                    !networkInterface.isUp ||
                    networkInterface.isLoopback
                ) {
                    continue
                }


                val type =
                    getInterfaceType(
                        networkInterface.name
                    )


                android.util.Log.d(
                    "DropLinkNetwork",
                    "INTERFACE: " +
                        networkInterface.name +
                        " TYPE: " +
                        type
                )


                val addresses =
                    networkInterface
                        .inetAddresses


                while (
                    addresses.hasMoreElements()
                ) {

                    val address =
                        addresses.nextElement()


                    android.util.Log.d(
                        "DropLinkNetwork",
                        "ADDRESS: " +
                            address.hostAddress
                    )


                    /*
                     * Ignore loopback and link-local.
                     */

                    if (
                        address.isLoopbackAddress ||
                        address.isLinkLocalAddress
                    ) {
                        continue
                    }


                    /*
                     * Ignore IPv6 multicast.
                     */

                    if (
                        address is Inet6Address &&
                        address.isMulticastAddress
                    ) {
                        continue
                    }


                    result.add(
                        NetworkAddress(
                            address =
                                address,

                            type =
                                type,

                            interfaceName =
                                networkInterface.name
                        )
                    )
                }
            }

        } catch (e: Exception) {

            android.util.Log.e(
                "DropLinkNetwork",
                "NETWORK ERROR",
                e
            )
        }

        return result
    }


    /*
     * =========================================================
     * IPV6 VALIDATION
     * =========================================================
     */
    private fun isUsableIpv6(
        address: Inet6Address
    ): Boolean {

        return !address.isLoopbackAddress &&
                !address.isLinkLocalAddress &&
                !address.isSiteLocalAddress &&
                !address.isMulticastAddress
    }


    /*
     * =========================================================
     * INTERFACE TYPE
     * =========================================================
     */
    private fun getInterfaceType(
        name: String
    ): String {

        val lower =
            name.lowercase()

        return when {

            lower.contains("rmnet") ->
                "Cellular"

            lower.contains("wlan") ->
                "WiFi/Hotspot"

            lower.contains("wifi") ->
                "WiFi"

            lower.contains("ap") ->
                "Hotspot"

            lower.contains("eth") ->
                "Ethernet"

            else ->
                "Local"
        }
    }
    fun getPreferredAddress(): NetworkAddress? {
    return getInternetNetworkAddress()
}
}


/*
 * =========================================================
 * NETWORK ADDRESS
 * =========================================================
 */
data class NetworkAddress(
    val address: java.net.InetAddress,
    val type: String,
    val interfaceName: String
)