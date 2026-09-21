cask "myapp" do
  arch arm: "aarch64"

  version "0.1.0"
  sha256 "no-hash-yet"

  url "https://github.com/your-username/my-app/releases/download/v#{version}/My App_#{version}_#{arch}.dmg"
  name "My App"
  desc "A cross-platform desktop app built with Tauri."
  homepage "https://github.com/your-username/my-app"

  depends_on macos: :big_sur
  depends_on arch: :arm64

  app "My App.app"

  # Unsigned/un-notarized build: strip the quarantine flag Gatekeeper adds on download.
  postflight do
    system_command "/usr/bin/xattr",
                    args: ["-cr", "#{appdir}/My App.app"]
  end

  zap trash: [
    "~/Library/Application Support/com.example.myapp",
    "~/Library/Caches/com.example.myapp",
    "~/Library/Preferences/com.example.myapp.plist",
    "~/Library/Saved Application State/com.example.myapp.savedState",
  ]
end
