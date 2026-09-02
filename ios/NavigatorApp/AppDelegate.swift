import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit
import FBSDKCoreKit
import GoogleSignIn

class AppDelegate: RCTAppDelegate {
    private static let fatalErrorKey = "ForBoxLastFatalReactNativeError"

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // This runs before React Native starts, so it also catches errors that happen
        // before the JS-level ErrorUtils handler or App component can be installed.
        installFatalErrorRecorder()

        // Do not start React Native again when the previous launch already proved it
        // crashes during bootstrap. A native-only screen guarantees that a remote
        // tester can read and screenshot the original error without a connected Mac.
        if let fatalError = UserDefaults.standard.string(forKey: Self.fatalErrorKey) {
            showFatalErrorScreen(fatalError)
            return true
        }

         // Initialize ReactNativeNotifications
        RNNotifications.startMonitorNotifications()

        // Initialize the Facebook SDK
        ApplicationDelegate.shared.application(
            application,
            didFinishLaunchingWithOptions: launchOptions
        )

        moduleName = "NavigatorApp"
        dependencyProvider = RCTAppDependencyProvider()

        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    private func installFatalErrorRecorder() {
        RCTSetFatalHandler { error in
            guard let error = error as NSError? else {
                NSException(
                    name: NSExceptionName("ForBoxReactNativeFatalException"),
                    reason: "React Native reported a fatal error without NSError details",
                    userInfo: nil
                ).raise()
                return
            }

            let timestamp = ISO8601DateFormatter().string(from: Date())
            let details = """
            Time: \(timestamp)

            \(error.localizedDescription)

            Domain: \(error.domain)
            Code: \(error.code)

            UserInfo:
            \(String(describing: error.userInfo))
            """

            UserDefaults.standard.set(details, forKey: Self.fatalErrorKey)
            UserDefaults.standard.synchronize()

            // Preserve the normal fatal behavior and an Apple crash report, while
            // keeping the complete message available for the next native-only launch.
            NSException(
                name: NSExceptionName("ForBoxReactNativeFatalException"),
                reason: error.localizedDescription,
                userInfo: error.userInfo
            ).raise()
        }
    }

    private func showFatalErrorScreen(_ details: String) {
        let viewController = UIViewController()
        viewController.view.backgroundColor = .systemBackground

        let titleLabel = UILabel()
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = .preferredFont(forTextStyle: .headline)
        titleLabel.numberOfLines = 0
        titleLabel.text = "上次启动发生致命错误，请截图发给开发者"

        let textView = UITextView()
        textView.translatesAutoresizingMaskIntoConstraints = false
        textView.isEditable = false
        textView.isSelectable = true
        textView.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        textView.text = details

        let retryButton = UIButton(type: .system)
        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.setTitle("清除记录（下次启动重试）", for: .normal)
        retryButton.addAction(UIAction { _ in
            UserDefaults.standard.removeObject(forKey: Self.fatalErrorKey)
            UserDefaults.standard.synchronize()
            retryButton.setTitle("已清除，请关闭并重新打开 App", for: .normal)
            retryButton.isEnabled = false
        }, for: .touchUpInside)

        viewController.view.addSubview(titleLabel)
        viewController.view.addSubview(textView)
        viewController.view.addSubview(retryButton)
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: viewController.view.safeAreaLayoutGuide.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: viewController.view.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: viewController.view.trailingAnchor, constant: -20),
            textView.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            textView.leadingAnchor.constraint(equalTo: viewController.view.leadingAnchor, constant: 16),
            textView.trailingAnchor.constraint(equalTo: viewController.view.trailingAnchor, constant: -16),
            retryButton.topAnchor.constraint(equalTo: textView.bottomAnchor, constant: 12),
            retryButton.leadingAnchor.constraint(equalTo: viewController.view.leadingAnchor, constant: 20),
            retryButton.trailingAnchor.constraint(equalTo: viewController.view.trailingAnchor, constant: -20),
            retryButton.bottomAnchor.constraint(equalTo: viewController.view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            retryButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
        ])

        let diagnosticWindow = UIWindow(frame: UIScreen.main.bounds)
        diagnosticWindow.rootViewController = viewController
        diagnosticWindow.makeKeyAndVisible()
        window = diagnosticWindow
    }

    @objc override func application(
        _ application: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        // Let the Facebook SDK handle the URL
        if ApplicationDelegate.shared.application(
            application,
            open: url,
            sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String,
            annotation: options[UIApplication.OpenURLOptionsKey.annotation]
        ) {
            return true
        }

         // Let Google Sign-In handle the URL
        if GIDSignIn.sharedInstance.handle(url) {
            return true
        }

        // Otherwise fallback to RCTLinkingManager for other deep links
        return RCTLinkingManager.application(application, open: url, options: options)
    }

    override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
      RNNotifications.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
    }

    override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        RNNotifications.didFailToRegisterForRemoteNotificationsWithError(error)
    }

    override func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        RNNotifications.didReceiveBackgroundNotification(userInfo, withCompletionHandler: completionHandler)
    }

    override func sourceURL(for _: RCTBridge) -> URL? {
        bundleURL()
    }

    override func bundleURL() -> URL? {
        #if DEBUG
            return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
            return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
    }

    override func customize(_ rootView: RCTRootView!) {
        super.customize(rootView)
        RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
    }
}

@main
class MainApp {
    static func main() {
        UIApplicationMain(
            CommandLine.argc,
            CommandLine.unsafeArgv,
            nil,
            NSStringFromClass(AppDelegate.self)
        )
    }
}
