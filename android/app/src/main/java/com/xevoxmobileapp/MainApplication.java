@Override
protected List<ReactPackage> getPackages() {
  @SuppressWarnings("UnnecessaryLocalVariable")
  List<ReactPackage> packages = new ArrayList<ReactPackage>(
    Arrays.<ReactPackage>asList(
      new MainReactPackage(),
      new VeePooSDKPackage(),  // Add this
      new HBandAndroidSDKPackage()  // Add this
    ));
  return packages;
}