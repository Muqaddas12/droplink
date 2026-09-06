package com.muqaddas123.droplink.wifi

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.net.Inet4Address
import java.net.NetworkInterface
import android.content.Intent
import android.provider.Settings
class WifiModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WifiModule"
    }

    @ReactMethod
    fun getNetworkStatus(promise: Promise) {

        try {

            val connectivityManager =
                reactContext.getSystemService(
                    Context.CONNECTIVITY_SERVICE
                ) as ConnectivityManager

            var isWifi = false
            var isDataOn = false

            /*
             * Check currently available networks.
             */
            for (network in connectivityManager.allNetworks) {

                val capabilities =
                    connectivityManager.getNetworkCapabilities(network)
                        ?: continue

                if (
                    capabilities.hasTransport(
                        NetworkCapabilities.TRANSPORT_WIFI
                    )
                ) {
                    isWifi = true
                }

                if (
                    capabilities.hasTransport(
                        NetworkCapabilities.TRANSPORT_CELLULAR
                    )
                ) {
                    isDataOn = true
                }
            }

            /*
             * Detect SoftAP / Hotspot interface.
             */
            val hotspotInfo = detectHotspotInterface()

            val result = Arguments.createMap()

            result.putBoolean("isWifi", isWifi)
            result.putBoolean("isDataOn", isDataOn)
            result.putBoolean(
                "isHotspot",
                hotspotInfo.isHotspot
            )

            result.putString(
                "hotspotInterface",
                hotspotInfo.interfaceName
            )

            result.putString(
                "localIp",
                hotspotInfo.localIp
            )

            promise.resolve(result)

        } catch (e: SecurityException) {

            promise.reject(
                "NETWORK_PERMISSION_ERROR",
                "ACCESS_NETWORK_STATE permission is required",
                e
            )

        } catch (e: Exception) {

            promise.reject(
                "NETWORK_STATUS_ERROR",
                e.message,
                e
            )
        }
    }

    private fun detectHotspotInterface(): HotspotInfo {

        /*
         * Common SoftAP interface names used by Android devices.
         *
         * Different manufacturers may use different names.
         */
        val hotspotNames = setOf(
            "ap0",
            "wlan1",
            "wlan2",
            "swlan0",
            "softap0",
            "wifiap0",
            "ap1"
        )

        try {

            val interfaces =
                NetworkInterface.getNetworkInterfaces()

            while (interfaces.hasMoreElements()) {

                val networkInterface =
                    interfaces.nextElement()

                val name =
                    networkInterface.name.lowercase()

                if (!networkInterface.isUp) {
                    continue
                }

                /*
                 * Exact interface-name match.
                 */
                if (hotspotNames.contains(name)) {

                    val ip = getIPv4Address(networkInterface)

                    return HotspotInfo(
                        true,
                        networkInterface.name,
                        ip
                    )
                }

                /*
                 * Some OEM devices use names containing
                 * "softap", "hotspot", or "ap".
                 */
                if (
                    name.contains("softap") ||
                    name.contains("hotspot")
                ) {

                    val ip = getIPv4Address(networkInterface)

                    return HotspotInfo(
                        true,
                        networkInterface.name,
                        ip
                    )
                }
            }

        } catch (_: Exception) {
            // Ignore and return false below.
        }

        return HotspotInfo(
            false,
            null,
            null
        )
    }

    private fun getIPv4Address(
        networkInterface: NetworkInterface
    ): String? {

        try {

            val addresses =
                networkInterface.inetAddresses

            while (addresses.hasMoreElements()) {

                val address =
                    addresses.nextElement()

                if (
                    address is Inet4Address &&
                    !address.isLoopbackAddress
                ) {
                    return address.hostAddress
                }
            }

        } catch (_: Exception) {
        }

        return null
    }
  @ReactMethod
fun openHotspotSettings(promise: Promise) {
    try {
        val packageManager = reactContext.packageManager

        val intents = listOf(
            Intent("android.settings.TETHER_SETTINGS"),
            Intent("android.settings.HOTSPOT_SETTINGS"),
            Intent("android.settings.WIFI_AP_SETTINGS"),
            Intent(Settings.ACTION_WIRELESS_SETTINGS)
        )

        for (intent in intents) {

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            if (intent.resolveActivity(packageManager) != null) {
                reactContext.startActivity(intent)
                promise.resolve(true)
                return
            }
        }

        promise.reject(
            "OPEN_HOTSPOT_SETTINGS_ERROR",
            "Hotspot settings activity not found"
        )

    } catch (e: Exception) {
        promise.reject(
            "OPEN_HOTSPOT_SETTINGS_ERROR",
            e.message,
            e
        )
    }
}

    private data class HotspotInfo(
        val isHotspot: Boolean,
        val interfaceName: String?,
        val localIp: String?
    )
}