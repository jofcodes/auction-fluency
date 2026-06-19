package com.meta.auctionfluency;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;

/**
 * Auction Fluency – Portal Learning App Main Activity
 *
 * Thin Android WebView wrapper hosting self-contained HTML/CSS/JS educational app
 * from assets/www/. No network required for core quiz functionality; reading links
 * open externally when corpnet available.
 *
 * Portal-specific behavior implemented here (not in web layer):
 * - Fullscreen immersive sticky mode hides status and navigation bars
 * - FLAG_KEEP_SCREEN_ON prevents screen timeout during learning sessions
 * - Landscape orientation locked via AndroidManifest (sensorLandscape for both landscape rotations)
 * - DOM storage enabled for localStorage progress persistence across app restarts
 * - File access from file URLs enabled to allow WebView to load bundled assets
 * - JavaScript console bridged to logcat with tag "AuctionFluency" for remote debugging via adb logcat
 * - WebView debugging enabled for Chrome DevTools remote inspector at chrome://inspect
 *
 * Build pattern matches My Sous Chef app: shell script build with aapt javac d8 apksigner,
 * no Gradle overhead, suitable for rapid iteration on Portal via ADB sideload.
 */
public class MainActivity extends Activity {

    private static final String TAG = "AuctionFluency";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen awake while app is active – Portal constraint
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true); // localStorage for progress tracking across sessions
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);  // required for file:///android_asset/... XHR/fetch in WebView
        settings.setAllowUniversalAccessFromFileURLs(true); // required for file scheme CORS workaround (though we now embed JSON to avoid fetch dependency)
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE); // always load fresh assets from APK after updates, avoid stale WebView cache

        webView.setWebViewClient(new WebViewClient());

        // Enhanced WebChromeClient to log JavaScript console to logcat for debugging on Portal
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                Log.d(TAG, cm.message() + " -- From line " + cm.lineNumber() + " of " + cm.sourceId());
                return true;
            }
        });

        // Enable WebView debugging for Chrome DevTools remote inspector via chrome://inspect
        WebView.setWebContentsDebuggingEnabled(true);

        // Load single-page app from assets
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            // Immersive sticky fullscreen – hide status and nav bars for Portal
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
