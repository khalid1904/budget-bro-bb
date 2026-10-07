package app.lovable.p83abe351206248f9a1cefeca04124c9c;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReceiptSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
