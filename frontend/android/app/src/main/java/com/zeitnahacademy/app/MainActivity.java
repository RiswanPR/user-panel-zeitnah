package com.zeitnahacademy.app;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // WindowManager.LayoutParams.FLAG_SECURE protects LMS video & quiz content from screenshots / recording
        // Uncomment below to strictly enforce OS-level screen capture blocking on Android:
        // getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
    }
}

