# Wear OS module proguard rules
-keepattributes *Annotation*

# Firebase
-keep class com.google.firebase.** { *; }

# Wearable Data Layer
-keep class com.google.android.gms.wearable.** { *; }
