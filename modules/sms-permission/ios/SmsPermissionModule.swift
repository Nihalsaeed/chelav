import ExpoModulesCore

public class SmsPermissionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmsPermission")

    AsyncFunction("requestSmsPermission") { promise in
      promise.resolve(true)
    }

    Function("checkSmsPermission") {
      return false
    }

    Function("getSmsMessages") { (limit: Int?) in
      return []
    }

    Events("onPermissionResult")
  }
}