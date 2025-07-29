# Add project specific ProGuard rules here.

# Keep HBand SDK classes
-keep class com.veepoo.** { *; }
-dontwarn com.veepoo.**

-keep class com.jieli.** { *; }
-dontwarn com.jieli.**

-keep class com.hband.** { *; }
-dontwarn com.hband.**

# Keep Bluetooth related classes
-keep class android.bluetooth.** { *; }
-keep class androidx.bluetooth.** { *; }

# Keep Gson classes
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Keep native module classes
-keep class com.xevoxmobileapp.** { *; }

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}