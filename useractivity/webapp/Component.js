/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "com/lb/useractivity/model/models",
        "sap/ui/core/Component",
        "sap/m/Button",
        "sap/m/Bar",
        "sap/m/MessageToast"
    ],
    function (UIComponent, Device, models,Component, Button, Bar, MessageToast) {
        "use strict";

        return UIComponent.extend("com.lb.useractivity.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                var rendererPromise = this._getRenderer();
                // This is example code. Please replace with your implementation!

            
                this._logUserLogin();
                this._subscribeEvents();
            },
            _logUserLogin: function () {
                var oEntry = {};
                oEntry.browser = sap.ui.Device.browser.name;
                //Call OData
                this.getModel().create("/userLoginSet", oEntry, {
                    success: function (oData, response) {
                        //oData - contains the data of the newly created entry
                        //response - parameter contains information about the response of the request (this may be your message)
                    },
                    error: function (oError) {
                        //oError - contains additional error information.
                    },
                    async: true
                });
            },
            _subscribeEvents: function () {
                this.UserTiles = [];
                var that = this;
                sap.ushell.Container.getService("LaunchPage").getGroups().then(function (aGroups) {
                    for (var i = 0; i < aGroups.length; i++) {
                        var aGrpTiles =
                            sap.ushell.Container.getService("LaunchPage").getGroupTiles(aGroups[i]);
                        for (var j = 0; j < aGrpTiles.length; j++) {
                            var sTileTitle = sap.ushell.Container.getService("LaunchPage").getTileTitle(aGrpTiles[j]);
                            var sTileTarget = sap.ushell.Container.getService("LaunchPage").getCatalogTileTargetURL(aGrpTiles[j]);
                            var sGroupTitle = sap.ushell.Container.getService("LaunchPage").getGroupTitle(aGrpTiles[j]);
    
                            if (sTileTarget !== undefined && sTileTitle.indexOf("App Launcher") === 0) {
                                sTileTitle = sTileTarget;
                            }
                            if (sTileTarget === undefined) {
                                continue;
                            }
                            var sURL = this._getHashFromURL(sTileTarget);
                            that.UserTiles.push({
                                appTitle: sTileTitle,
                                groupTitle: sGroupTitle,
                                url: sURL
                            });
                        }
                    }
                }.bind(this));
                var that = this;
                //	window.addEventListener("hashchange", this._onHashChange.bind(this), true);
                //to make it work in IE
                var lastURL = document.URL;
                window.addEventListener("hashchange", function (event) {
                    Object.defineProperty(event, "oldURL", {
                        enumerable: true,
                        configurable: true,
                        value: lastURL
                    });
                    Object.defineProperty(event, "newURL", {
                        enumerable: true,
                        configurable: true,
                        value: document.URL
                    });
    
                    this._onHashChange(event);
                }.bind(this));
    
            },
    
            _onHashChange: function (oEvent) {
                var oEntry = {};
                var sOldHash = this._getHashFromURL(oEvent.oldURL);
                var sNewHash = this._getHashFromURL(oEvent.newURL);
                //handled for the change of URL while navigation within the app
                if (sOldHash !== sNewHash && sNewHash !== "" && sNewHash !== undefined) {
                    var tile = this.filterUserTiles(this.UserTiles, sNewHash);
                    if (tile.length > 0) {
                        // There could be more dupliacte tiles at times for MGT users
                        oEntry.AppTitle = tile[0].appTitle;
                        oEntry.GroupTitle = tile[0].groupTitle;
                        oEntry.Targetmapping = tile[0].url;
                        //Call OData
                        this.getModel().create("/userActivitySet", oEntry, {
                            success: function (oData, response) {
                                //oData - contains the data of the newly created entry
                                //response - parameter contains information about the response of the request (this may be your message)
                            },
                            error: function (oError) {
                                //oError - contains additional error information.
                            },
                            async: true
                        });
                    }
                }
            },
    
            filterUserTiles: function (arr, query) {
                return arr.filter(function (el) {
                    return el.url.toLowerCase().indexOf(query.toLowerCase()) !== -1;
                });
            },
            _getHashFromURL: function (url) {
                if (url !== undefined || url !== null || url !== "") {
                    var parts = url.split('#');
                    //Remove BLANK/Empty values from array
                    parts = parts.filter(Boolean);
                    if (parts.length > 0) {
                        return parts.pop();
                    } else {
                        return "";
                    }
                } else {
                    return "";
                }
            },
            /**
             * Returns the shell renderer instance in a reliable way,
             * i.e. independent from the initialization time of the plug-in.
             * This means that the current renderer is returned immediately, if it
             * is already created (plug-in is loaded after renderer creation) or it
             * listens to the &quot;rendererCreated&quot; event (plug-in is loaded
             * before the renderer is created).
             *
             *  @returns {object}
             *      a jQuery promise, resolved with the renderer instance, or
             *      rejected with an error message.
             */
            _getRenderer: function () {
                var that = this,
                    oDeferred = new jQuery.Deferred(),
                    oRenderer;
    
                that._oShellContainer = jQuery.sap.getObject("sap.ushell.Container");
                if (!that._oShellContainer) {
                    oDeferred.reject(
                        "Illegal state: shell container not available; this component must be executed in a unified shell runtime context.");
                } else {
                    oRenderer = that._oShellContainer.getRenderer();
                    if (oRenderer) {
                        oDeferred.resolve(oRenderer);
                    } else {
                        // renderer not initialized yet, listen to rendererCreated event
                        that._onRendererCreated = function (oEvent) {
                            oRenderer = oEvent.getParameter("renderer");
                            if (oRenderer) {
                                oDeferred.resolve(oRenderer);
                            } else {
                                oDeferred.reject("Illegal state: shell renderer not available after recieving 'rendererLoaded' event.");
                            }
                        };
                        that._oShellContainer.attachRendererCreatedEvent(that._onRendererCreated);
                    }
                }
                return oDeferred.promise();
            }
            
        });
    }
);