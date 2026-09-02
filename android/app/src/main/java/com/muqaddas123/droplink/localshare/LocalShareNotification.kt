package com.muqaddas123.droplink.localshare

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.muqaddas123.droplink.MainActivity
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object LocalShareNotification {

    private const val channelId = "local_share_server"
    private const val notificationId = 4101

    fun show(context: Context, url: String) {
        val manager =
            context.getSystemService(
                Context.NOTIFICATION_SERVICE
            ) as NotificationManager

        manager.createNotificationChannel(
            NotificationChannel(
                channelId,
                "Local Share server",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description =
                    "Shows when DropLink Local Share is running."
            }
        )

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            notificationId,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification =
            NotificationCompat.Builder(context, channelId)
                .setSmallIcon(
                    context.applicationInfo.icon
                )
                .setContentTitle("Local Share is running")
                .setContentText(url)
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .bigText(
                            "Devices on your network can connect at:\n$url"
                        )
                )
                .setContentIntent(contentIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .build()

        try {
            NotificationManagerCompat
                .from(context)
                .notify(notificationId, notification)
        } catch (error: SecurityException) {
            android.util.Log.w(
                "DropLink",
                "Notification permission was not granted.",
                error
            )
        }
    }

    fun clear(context: Context) {
        NotificationManagerCompat
            .from(context)
            .cancel(notificationId)
    }
}
