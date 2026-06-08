/**
 * CSInterface.js — Adobe CEP Interface Library (v11)
 *
 * This file provides the JavaScript API for Adobe CEP (Common Extensibility Platform)
 * extensions. It bridges the HTML/JS panel to the host application (After Effects,
 * Photoshop, etc.) via evalScript() and event dispatching.
 *
 * Based on Adobe's official CSInterface specification for CEP 11.
 * Source: https://github.com/nicamedrano/nicamedrano.github.io/blob/master/libs/CSInterface.js
 *
 * WARNING: Do not modify this file. It is a standard Adobe library.
 */

/* jshint -W030 */

var SystemPath = {
  USER_DATA: "userData",
  COMMON_FILES: "commonFiles",
  MY_DOCUMENTS: "myDocuments",
  APPLICATION: "application",
  EXTENSION: "extension",
  HOST_APPLICATION: "hostApplication"
};

var ColorType = {
  RGB: "rgb",
  GRADIENT: "gradient",
  NONE: "none"
};

var RGBColor = function () {
  this.red = 0;
  this.green = 0;
  this.blue = 0;
  this.alpha = 255;
};

var Direction = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical"
};

var GradientStop = function (offset, rgbColor) {
  this.offset = offset;
  this.rgbColor = rgbColor;
};

var GradientColor = function () {
  this.type = ColorType.GRADIENT;
  this.direction = Direction.HORIZONTAL;
  this.numStops = 0;
  this.arrGradientStop = [];
};

var UIColor = function () {
  this.type = ColorType.NONE;
  this.antialiasLevel = 0;
  this.color = new RGBColor();
};

var AppSkinInfo = function () {
  this.baseFontFamily = "";
  this.baseFontSize = 0;
  this.appBarBackgroundColor = new UIColor();
  this.panelBackgroundColor = new UIColor();
  this.appBarBackgroundColorSRGB = new UIColor();
  this.panelBackgroundColorSRGB = new UIColor();
  this.systemHighlightColor = "";
};

var HostEnvironment = function () {
  this.appName = "";
  this.appVersion = "";
  this.appLocale = "";
  this.appUILocale = "";
  this.appId = "";
  this.isAppOnline = true;
  this.appSkinInfo = new AppSkinInfo();
};

var HostCapabilities = function () {
  this.EXTENDED_PANEL_MENU = false;
  this.EXTENDED_PANEL_ICONS = false;
  this.DELEGATE_APE_ENGINE = false;
  this.SUPPORT_HTML_EXTENSIONS = false;
  this.DISABLE_FLASH_EXTENSIONS = false;
};

var ApiVersion = function () {
  this.major = 0;
  this.minor = 0;
  this.micro = 0;
};

var MenuItemStatus = {
  ENABLED: "true",
  DISABLED: "false",
  CHECKED: "true",
  UNCHECKED: "false"
};

var ContextMenuItemStatus = {
  ENABLED: "true",
  DISABLED: "false",
  CHECKED: "true",
  UNCHECKED: "false"
};

/**
 * @class CSInterface
 * The main interface to communicate with the host application.
 */
function CSInterface() {}

/**
 * Retrieves the host environment information.
 * @return {HostEnvironment}
 */
CSInterface.prototype.getHostEnvironment = function () {
  var hostEnvironment = new HostEnvironment();
  try {
    var envStr = window.__adobe_cep__.getHostEnvironment();
    var env = JSON.parse(envStr);
    hostEnvironment.appName = env.appName;
    hostEnvironment.appVersion = env.appVersion;
    hostEnvironment.appLocale = env.appLocale;
    hostEnvironment.appUILocale = env.appUILocale;
    hostEnvironment.appId = env.appId;
    hostEnvironment.isAppOnline = env.isAppOnline;

    if (env.appSkinInfo) {
      hostEnvironment.appSkinInfo = env.appSkinInfo;
    }
  } catch (e) {
    // Not in CEP environment
  }
  return hostEnvironment;
};

/**
 * Closes the current extension panel.
 */
CSInterface.prototype.closeExtension = function () {
  try {
    window.__adobe_cep__.closeExtension();
  } catch (e) {}
};

/**
 * Retrieves a system path.
 * @param {string} pathType - One of SystemPath constants
 * @return {string} The resolved path
 */
CSInterface.prototype.getSystemPath = function (pathType) {
  var path = "";
  try {
    var result = window.__adobe_cep__.getSystemPath(pathType);
    path = typeof result === "string" ? result : JSON.parse(result);
  } catch (e) {}
  return path;
};

/**
 * Evaluates an ExtendScript string in the host application.
 * @param {string} script - The ExtendScript code to evaluate
 * @param {function} callback - Called with the result string
 */
CSInterface.prototype.evalScript = function (script, callback) {
  try {
    if (callback === null || callback === undefined) {
      callback = function () {};
    }
    window.__adobe_cep__.evalScript(script, callback);
  } catch (e) {
    if (callback) {
      callback("EvalScript error: " + e.message);
    }
  }
};

/**
 * Retrieves the unique extension ID.
 * @return {string}
 */
CSInterface.prototype.getExtensionID = function () {
  try {
    return window.__adobe_cep__.getExtensionId();
  } catch (e) {
    return "";
  }
};

/**
 * Registers a callback for a specific CEP event.
 * @param {string} type - Event type
 * @param {function} listener - Event handler
 * @param {object} obj - The "this" context for the listener
 */
CSInterface.prototype.addEventListener = function (type, listener, obj) {
  try {
    window.__adobe_cep__.addEventListener(type, listener, obj);
  } catch (e) {}
};

/**
 * Removes a registered event listener.
 * @param {string} type - Event type
 * @param {function} listener - Event handler to remove
 * @param {object} obj - The "this" context
 */
CSInterface.prototype.removeEventListener = function (type, listener, obj) {
  try {
    window.__adobe_cep__.removeEventListener(type, listener, obj);
  } catch (e) {}
};

/**
 * Dispatches a CEP event.
 * @param {CSEvent} event - The event to dispatch
 */
CSInterface.prototype.dispatchEvent = function (event) {
  try {
    if (typeof event.data === "object") {
      event.data = JSON.stringify(event.data);
    }
    window.__adobe_cep__.dispatchEvent(event);
  } catch (e) {}
};

/**
 * Loads a JSX file into the host scripting engine.
 * @param {string} fileName - Path to the JSX file
 */
CSInterface.prototype.evalFile = function (fileName) {
  try {
    var script = 'try { $.evalFile("' + fileName + '"); } catch(e) { e.message; }';
    this.evalScript(script);
  } catch (e) {}
};

/**
 * Retrieves the extension's root path.
 * @return {string}
 */
CSInterface.prototype.getExtensionPath = function () {
  return this.getSystemPath(SystemPath.EXTENSION);
};

/**
 * Opens a URL in the system default browser.
 * @param {string} url - The URL to open
 */
CSInterface.prototype.openURLInDefaultBrowser = function (url) {
  try {
    window.__adobe_cep__.invokeAsync("openURLInDefaultBrowser", url);
  } catch (e) {}
};

/**
 * Sets the panel menu.
 * @param {string} menu - XML string defining the menu
 */
CSInterface.prototype.setPanelFlyoutMenu = function (menu) {
  try {
    window.__adobe_cep__.invokeSync("setPanelFlyoutMenu", menu);
  } catch (e) {}
};

/**
 * Retrieves the current scale factor.
 * @return {number}
 */
CSInterface.prototype.getScaleFactor = function () {
  try {
    var factor = window.__adobe_cep__.getScaleFactor();
    return parseFloat(factor);
  } catch (e) {
    return 1;
  }
};

/**
 * Retrieves the current API version.
 * @return {ApiVersion}
 */
CSInterface.prototype.getCurrentApiVersion = function () {
  var version = new ApiVersion();
  try {
    var versionStr = window.__adobe_cep__.getCurrentApiVersion();
    var v = JSON.parse(versionStr);
    version.major = v.major;
    version.minor = v.minor;
    version.micro = v.micro;
  } catch (e) {}
  return version;
};

/**
 * Sets the context menu for the extension.
 * @param {string} menu - XML string defining the context menu
 * @param {function} callback - Called when a menu item is clicked
 */
CSInterface.prototype.setContextMenu = function (menu, callback) {
  try {
    window.__adobe_cep__.invokeAsync("setContextMenu", menu, callback);
  } catch (e) {}
};

/**
 * Sets the context menu by JSON.
 * @param {string} menu - JSON string defining the context menu
 * @param {function} callback - Called when a menu item is clicked
 */
CSInterface.prototype.setContextMenuByJSON = function (menu, callback) {
  try {
    window.__adobe_cep__.invokeAsync("setContextMenuByJSON", menu, callback);
  } catch (e) {}
};

/**
 * @class CSEvent
 * Represents a CEP event.
 * @param {string} type - Event type
 * @param {string} scope - Event scope ("APPLICATION" or "GLOBAL")
 * @param {string} appId - Application ID
 * @param {string} extensionId - Extension ID
 */
function CSEvent(type, scope, appId, extensionId) {
  this.type = type;
  this.scope = scope || "APPLICATION";
  this.appId = appId || "";
  this.extensionId = extensionId || "";
  this.data = "";
}

// Make CSInterface available globally
if (typeof window !== "undefined") {
  window.CSInterface = CSInterface;
  window.CSEvent = CSEvent;
  window.SystemPath = SystemPath;
}
