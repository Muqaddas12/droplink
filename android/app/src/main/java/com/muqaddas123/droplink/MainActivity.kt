package com.muqaddas123.droplink

import android.os.Build
import android.os.Bundle

import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {

        // Native Android splash screen
        installSplashScreen()

        // Start React Native
        super.onCreate(null)
    }

    /**
     * Main React Native component.
     */
    override fun getMainComponentName(): String {
        return "main"
    }

    /**
     * React Native delegate.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {

        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,

            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ) {}
        )
    }

    /**
     * Android back button behavior.
     */
    override fun invokeDefaultOnBackPressed() {

        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {

            if (!moveTaskToBack(false)) {
                super.invokeDefaultOnBackPressed()
            }

            return
        }

        super.invokeDefaultOnBackPressed()
    }
}