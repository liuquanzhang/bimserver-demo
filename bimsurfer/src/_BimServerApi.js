(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.bimserverapi = {})));
}(this, (function (exports) { 'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};





var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var BimServerApiPromise = function () {
	function BimServerApiPromise() {
		var counter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
		classCallCheck(this, BimServerApiPromise);

		this.isDone = false;
		this.chains = [];
		this.callback = null;
		this.counter = counter;
	}

	createClass(BimServerApiPromise, [{
		key: "done",
		value: function done(callback) {
			if (this.isDone) {
				callback();
			} else {
				if (this.callback != null) {
					if (this.callback instanceof Array) {
						this.callback.push(callback);
					} else {
						this.callback = [this.callback, callback];
					}
				} else {
					this.callback = callback;
				}
			}
			return this;
		}
	}, {
		key: "inc",
		value: function inc() {
			if (this.counter == null) {
				this.counter = 0;
			}
			this.counter++;
		}
	}, {
		key: "dec",
		value: function dec() {
			if (this.counter == null) {
				this.counter = 0;
			}
			this.counter--;
			if (this.counter === 0) {
				this.done = true;
				this.fire();
			}
		}
	}, {
		key: "fire",
		value: function fire() {
			if (this.isDone) {
				console.log("Promise already fired, not triggering again...");
				return;
			}
			this.isDone = true;
			if (this.callback != null) {
				if (this.callback instanceof Array) {
					this.callback.forEach(function (cb) {
						cb();
					});
				} else {
					this.callback();
				}
			}
		}
	}, {
		key: "chain",
		value: function chain(otherPromise) {
			var _this = this;

			var promises = void 0;
			if (otherPromise instanceof Array) {
				promises = otherPromise;
			} else {
				promises = [otherPromise];
			}
			promises.forEach(function (promise) {
				if (!promise.isDone) {
					_this.chains.push(promise);
					promise.done(function () {
						for (var i = _this.chains.length - 1; i >= 0; i--) {
							if (_this.chains[i] == promise) {
								_this.chains.splice(i, 1);
							}
						}
						if (_this.chains.length === 0) {
							_this.fire();
						}
					});
				}
			});
			if (this.chains.length === 0) {
				this.fire();
			}
		}
	}]);
	return BimServerApiPromise;
}();

var BimServerApiWebSocket = function () {
	function BimServerApiWebSocket(baseUrl, bimServerApi) {
		classCallCheck(this, BimServerApiWebSocket);

		this.connected = false;
		this.openCallbacks = [];
		this.endPointId = null;
		this.listener = null;
		this.tosend = [];
		this.tosendAfterConnect = [];
		this.messagesReceived = 0;
		this.intervalId = null;
		this.baseUrl = baseUrl;
		this.bimServerApi = bimServerApi;
	}

	createClass(BimServerApiWebSocket, [{
		key: "connect",
		value: function connect() {
			var _this = this;

			var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

			if (this.connected) {
				if (callback != null) {
					callback();
				}
				return Promise.resolve();
			}
			console.info("Connecting websocket");
			var promise = new Promise(function (resolve, reject) {
				_this.openCallbacks.push(function () {
					resolve();
				});
				if (callback != null) {
					if (typeof callback === "function") {
						_this.openCallbacks.push(callback);
					} else {
						console.error("Callback was not a function", callback);
					}
				}

				var location = _this.bimServerApi.baseUrl.toString().replace('http://', 'ws://').replace('https://', 'wss://') + "/stream";

				try {
					_this._ws = new WebSocket(location);
					_this._ws.binaryType = "arraybuffer";
					_this._ws.onopen = _this._onopen.bind(_this);
					_this._ws.onmessage = _this._onmessage.bind(_this);
					_this._ws.onclose = _this._onclose.bind(_this);
					_this._ws.onerror = _this._onerror.bind(_this);
				} catch (err) {
					console.error(err);
					_this.bimServerApi.notifier.setError("WebSocket error" + (err.message !== undefined ? ": " + err.message : ""));
				}
			});
			return promise;
		}
	}, {
		key: "_onerror",
		value: function _onerror(err) {
			console.log(err);
			this.bimServerApi.notifier.setError("WebSocket error" + (err.message !== undefined ? ": " + err.message : ""));
		}
	}, {
		key: "_onopen",
		value: function _onopen() {
			var _this2 = this;

			this.intervalId = setInterval(function () {
				_this2.send({ "hb": true });
			}, 30 * 1000); // Send hb every 30 seconds
			while (this.tosendAfterConnect.length > 0 && this._ws.readyState == 1) {
				var messageArray = this.tosendAfterConnect.splice(0, 1);
				this._sendWithoutEndPoint(messageArray[0]);
			}
		}
	}, {
		key: "_sendWithoutEndPoint",
		value: function _sendWithoutEndPoint(message) {
			if (this._ws && this._ws.readyState == 1) {
				this._ws.send(message);
			} else {
				this.tosendAfterConnect.push(message);
			}
		}
	}, {
		key: "_send",
		value: function _send(message) {
			if (this._ws && this._ws.readyState == 1 && this.endPointId != null) {
				this._ws.send(message);
			} else {
				console.log("Waiting", message);
				this.tosend.push(message);
			}
		}
	}, {
		key: "send",
		value: function send(object) {
			var str = JSON.stringify(object);
			this.bimServerApi.log("Sending", str);
			this._send(str);
		}
	}, {
		key: "_onmessage",
		value: function _onmessage(message) {
			var _this3 = this;

			this.messagesReceived++;
			if (message.data instanceof ArrayBuffer) {
				this.listener(message.data);
			} else {
				var incomingMessage = JSON.parse(message.data);
				this.bimServerApi.log("incoming", incomingMessage);
				if (incomingMessage.welcome !== undefined) {
					this._sendWithoutEndPoint(JSON.stringify({ "token": this.bimServerApi.token }));
				} else if (incomingMessage.endpointid !== undefined) {
					this.endPointId = incomingMessage.endpointid;
					this.connected = true;
					this.openCallbacks.forEach(function (callback) {
						callback();
					});
					while (this.tosend.length > 0 && this._ws.readyState == 1) {
						var messageArray = this.tosend.splice(0, 1);
						console.log(messageArray[0]);
						this._send(messageArray[0]);
					}
					this.openCallbacks = [];
				} else {
					if (incomingMessage.request !== undefined) {
						this.listener(incomingMessage.request);
					} else if (incomingMessage.requests !== undefined) {
						incomingMessage.requests.forEach(function (request) {
							_this3.listener(request);
						});
					}
				}
			}
		}
	}, {
		key: "_onclose",
		value: function _onclose(m) {
			console.log("WebSocket closed", m);
			clearInterval(this.intervalId);
			this._ws = null;
			this.connected = false;
			this.openCallbacks = [];
			this.endpointid = null;
		}
	}]);
	return BimServerApiWebSocket;
}();

var geometry = {
	"classes": {
		"Vector3f": {
			"domain": "bimserver",
			"superclasses": [],
			"fields": {
				"x": {
					"type": "float",
					"reference": false,
					"many": false
				},
				"y": {
					"type": "float",
					"reference": false,
					"many": false
				},
				"z": {
					"type": "float",
					"reference": false,
					"many": false
				}
			}
		},
		"GeometryData": {
			"domain": "bimserver",
			"superclasses": [],
			"fields": {}
		},
		"GeometryInfo": {
			"domain": "bimserver",
			"superclasses": [],
			"fields": {
				"minBounds": {
					"type": "Vector3f",
					"reference": true,
					"many": false
				},
				"maxBounds": {
					"type": "Vector3f",
					"reference": true,
					"many": false
				},
				"startVertex": {
					"type": "int",
					"reference": false,
					"many": false
				},
				"startIndex": {
					"type": "int",
					"reference": false,
					"many": false
				},
				"primitiveCount": {
					"type": "int",
					"reference": false,
					"many": false
				},
				"data": {
					"type": "GeometryData",
					"reference": true,
					"many": false
				},
				"transformation": {
					"type": "float",
					"reference": false,
					"many": true
				},
				"area": {
					"type": "float",
					"reference": false,
					"many": false
				},
				"volume": {
					"type": "float",
					"reference": false,
					"many": false
				}
			}
		}
	}
};

var ifc2x3tc1 = {
	"classes": {
		"Tristate": {},
		"Ifc2DCompositeCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCompositeCurve"],
			"fields": {}
		},
		"IfcActionRequest": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": ["IfcControl"],
			"fields": {
				"RequestID": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcActor": {
			"domain": "ifckernel",
			"superclasses": ["IfcObject"],
			"fields": {
				"TheActor": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"IsActingUpon": {
					"type": "IfcRelAssignsToActor",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcActorRole": {
			"domain": "ifcactorresource",
			"superclasses": [],
			"fields": {
				"Role": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedRole": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcActuatorType": {
			"domain": "ifcbuildingcontrolsdomain",
			"superclasses": ["IfcDistributionControlElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAddress": {
			"domain": "ifcactorresource",
			"superclasses": ["IfcObjectReferenceSelect"],
			"fields": {
				"Purpose": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedPurpose": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OfPerson": {
					"type": "IfcPerson",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"OfOrganization": {
					"type": "IfcOrganization",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcAirTerminalBoxType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowControllerType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAirTerminalType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAirToAirHeatRecoveryType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAlarmType": {
			"domain": "ifcbuildingcontrolsdomain",
			"superclasses": ["IfcDistributionControlElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAngularDimension": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcDimensionCurveDirectedCallout"],
			"fields": {}
		},
		"IfcAnnotation": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcProduct"],
			"fields": {
				"ContainedInStructure": {
					"type": "IfcRelContainedInSpatialStructure",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcAnnotationCurveOccurrence": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcAnnotationOccurrence", "IfcDraughtingCalloutElement"],
			"fields": {}
		},
		"IfcAnnotationFillArea": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"OuterBoundary": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"InnerBoundaries": {
					"type": "IfcCurve",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcAnnotationFillAreaOccurrence": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcAnnotationOccurrence"],
			"fields": {
				"FillStyleTarget": {
					"type": "IfcPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"GlobalOrLocal": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAnnotationOccurrence": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcStyledItem"],
			"fields": {}
		},
		"IfcAnnotationSurface": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Item": {
					"type": "IfcGeometricRepresentationItem",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TextureCoordinates": {
					"type": "IfcTextureCoordinate",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcAnnotationSurfaceOccurrence": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcAnnotationOccurrence"],
			"fields": {}
		},
		"IfcAnnotationSymbolOccurrence": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcAnnotationOccurrence", "IfcDraughtingCalloutElement"],
			"fields": {}
		},
		"IfcAnnotationTextOccurrence": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcAnnotationOccurrence", "IfcDraughtingCalloutElement"],
			"fields": {}
		},
		"IfcApplication": {
			"domain": "ifcutilityresource",
			"superclasses": [],
			"fields": {
				"ApplicationDeveloper": {
					"type": "IfcOrganization",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Version": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ApplicationFullName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ApplicationIdentifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAppliedValue": {
			"domain": "ifccostresource",
			"superclasses": ["IfcObjectReferenceSelect"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AppliedValue": {
					"type": "IfcAppliedValueSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"UnitBasis": {
					"type": "IfcMeasureWithUnit",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ApplicableDate": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"FixedUntilDate": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ValuesReferenced": {
					"type": "IfcReferencesValueDocument",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ValueOfComponents": {
					"type": "IfcAppliedValueRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsComponentIn": {
					"type": "IfcAppliedValueRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcAppliedValueRelationship": {
			"domain": "ifccostresource",
			"superclasses": [],
			"fields": {
				"ComponentOfTotal": {
					"type": "IfcAppliedValue",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"Components": {
					"type": "IfcAppliedValue",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ArithmeticOperator": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcApproval": {
			"domain": "ifcapprovalresource",
			"superclasses": [],
			"fields": {
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ApprovalDateTime": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ApprovalStatus": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ApprovalLevel": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ApprovalQualifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Identifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Actors": {
					"type": "IfcApprovalActorRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsRelatedWith": {
					"type": "IfcApprovalRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Relates": {
					"type": "IfcApprovalRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcApprovalActorRelationship": {
			"domain": "ifcapprovalresource",
			"superclasses": [],
			"fields": {
				"Actor": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Approval": {
					"type": "IfcApproval",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"Role": {
					"type": "IfcActorRole",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcApprovalPropertyRelationship": {
			"domain": "ifcapprovalresource",
			"superclasses": [],
			"fields": {
				"ApprovedProperties": {
					"type": "IfcProperty",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Approval": {
					"type": "IfcApproval",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcApprovalRelationship": {
			"domain": "ifcapprovalresource",
			"superclasses": [],
			"fields": {
				"RelatedApproval": {
					"type": "IfcApproval",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatingApproval": {
					"type": "IfcApproval",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcArbitraryClosedProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcProfileDef"],
			"fields": {
				"OuterCurve": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcArbitraryOpenProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcProfileDef"],
			"fields": {
				"Curve": {
					"type": "IfcBoundedCurve",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcArbitraryProfileDefWithVoids": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcArbitraryClosedProfileDef"],
			"fields": {
				"InnerCurves": {
					"type": "IfcCurve",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcAsset": {
			"domain": "ifcsharedfacilitieselements",
			"superclasses": ["IfcGroup"],
			"fields": {
				"AssetID": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OriginalValue": {
					"type": "IfcCostValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CurrentValue": {
					"type": "IfcCostValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TotalReplacementCost": {
					"type": "IfcCostValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Owner": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"User": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ResponsiblePerson": {
					"type": "IfcPerson",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"IncorporationDate": {
					"type": "IfcCalendarDate",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"DepreciatedValue": {
					"type": "IfcCostValue",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAsymmetricIShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcIShapeProfileDef"],
			"fields": {
				"TopFlangeWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopFlangeWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopFlangeThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopFlangeThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopFlangeFilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopFlangeFilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAxis1Placement": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcPlacement"],
			"fields": {
				"Axis": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAxis2Placement2D": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcPlacement", "IfcAxis2Placement"],
			"fields": {
				"RefDirection": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAxis2Placement3D": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcPlacement", "IfcAxis2Placement"],
			"fields": {
				"Axis": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"RefDirection": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBSplineCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcBoundedCurve"],
			"fields": {
				"Degree": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ControlPointsList": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"CurveForm": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ClosedCurve": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SelfIntersect": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBeam": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {}
		},
		"IfcBeamType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBezierCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcBSplineCurve"],
			"fields": {}
		},
		"IfcBlobTexture": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSurfaceTexture"],
			"fields": {
				"RasterFormat": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RasterCode": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBlock": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcCsgPrimitive3D"],
			"fields": {
				"XLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"XLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ZLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ZLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoilerType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBooleanClippingResult": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcBooleanResult"],
			"fields": {}
		},
		"IfcBooleanResult": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcBooleanOperand", "IfcCsgSelect"],
			"fields": {
				"Operator": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FirstOperand": {
					"type": "IfcBooleanOperand",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SecondOperand": {
					"type": "IfcBooleanOperand",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoundaryCondition": {
			"domain": "ifcstructuralloadresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoundaryEdgeCondition": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcBoundaryCondition"],
			"fields": {
				"LinearStiffnessByLengthX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByLengthXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByLengthY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByLengthYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByLengthZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByLengthZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessByLengthX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessByLengthXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessByLengthY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessByLengthYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessByLengthZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessByLengthZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoundaryFaceCondition": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcBoundaryCondition"],
			"fields": {
				"LinearStiffnessByAreaX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByAreaXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByAreaY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByAreaYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByAreaZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessByAreaZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoundaryNodeCondition": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcBoundaryCondition"],
			"fields": {
				"LinearStiffnessX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearStiffnessZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalStiffnessZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoundaryNodeConditionWarping": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcBoundaryNodeCondition"],
			"fields": {
				"WarpingStiffness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WarpingStiffnessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoundedCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCurve", "IfcCurveOrEdgeCurve"],
			"fields": {}
		},
		"IfcBoundedSurface": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcSurface"],
			"fields": {}
		},
		"IfcBoundingBox": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Corner": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"XDim": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"XDimAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YDim": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YDimAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ZDim": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ZDimAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoxedHalfSpace": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcHalfSpaceSolid"],
			"fields": {
				"Enclosure": {
					"type": "IfcBoundingBox",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBuilding": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcSpatialStructureElement"],
			"fields": {
				"ElevationOfRefHeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ElevationOfRefHeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ElevationOfTerrain": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ElevationOfTerrainAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BuildingAddress": {
					"type": "IfcPostalAddress",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBuildingElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {}
		},
		"IfcBuildingElementComponent": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcBuildingElement"],
			"fields": {}
		},
		"IfcBuildingElementPart": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcBuildingElementComponent"],
			"fields": {}
		},
		"IfcBuildingElementProxy": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"CompositionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBuildingElementProxyType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBuildingElementType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElementType"],
			"fields": {}
		},
		"IfcBuildingStorey": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcSpatialStructureElement"],
			"fields": {
				"Elevation": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ElevationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"Depth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Width": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WallThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WallThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Girth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"GirthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InternalFilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InternalFilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCableCarrierFittingType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowFittingType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCableCarrierSegmentType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowSegmentType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCableSegmentType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowSegmentType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCalendarDate": {
			"domain": "ifcdatetimeresource",
			"superclasses": ["IfcDateTimeSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"DayComponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MonthComponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YearComponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCartesianPoint": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcPoint", "IfcTrimmingSelect"],
			"fields": {
				"Coordinates": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"CoordinatesAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCartesianTransformationOperator": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Axis1": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Axis2": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LocalOrigin": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Scale": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ScaleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCartesianTransformationOperator2D": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCartesianTransformationOperator"],
			"fields": {}
		},
		"IfcCartesianTransformationOperator2DnonUniform": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCartesianTransformationOperator2D"],
			"fields": {
				"Scale2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Scale2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCartesianTransformationOperator3D": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCartesianTransformationOperator"],
			"fields": {
				"Axis3": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCartesianTransformationOperator3DnonUniform": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCartesianTransformationOperator3D"],
			"fields": {
				"Scale2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Scale2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Scale3": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Scale3AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCenterLineProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcArbitraryOpenProfileDef"],
			"fields": {
				"Thickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcChamferEdgeFeature": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcEdgeFeature"],
			"fields": {
				"Width": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Height": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcChillerType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCircle": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcConic"],
			"fields": {
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCircleHollowProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcCircleProfileDef"],
			"fields": {
				"WallThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WallThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCircleProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcClassification": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {
				"Source": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Edition": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EditionDate": {
					"type": "IfcCalendarDate",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Contains": {
					"type": "IfcClassificationItem",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcClassificationItem": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {
				"Notation": {
					"type": "IfcClassificationNotationFacet",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ItemOf": {
					"type": "IfcClassification",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"Title": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IsClassifiedItemIn": {
					"type": "IfcClassificationItemRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsClassifyingItemIn": {
					"type": "IfcClassificationItemRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcClassificationItemRelationship": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {
				"RelatingItem": {
					"type": "IfcClassificationItem",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedItems": {
					"type": "IfcClassificationItem",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcClassificationNotation": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": ["IfcClassificationNotationSelect"],
			"fields": {
				"NotationFacets": {
					"type": "IfcClassificationNotationFacet",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcClassificationNotationFacet": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {
				"NotationValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcClassificationReference": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": ["IfcExternalReference", "IfcClassificationNotationSelect"],
			"fields": {
				"ReferencedSource": {
					"type": "IfcClassification",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcClosedShell": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcConnectedFaceSet", "IfcShell"],
			"fields": {}
		},
		"IfcCoilType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcColourRgb": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcColourSpecification", "IfcColourOrFactor"],
			"fields": {
				"Red": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RedAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Green": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"GreenAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Blue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BlueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcColourSpecification": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcColour"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcColumn": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {}
		},
		"IfcColumnType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcComplexProperty": {
			"domain": "ifcpropertyresource",
			"superclasses": ["IfcProperty"],
			"fields": {
				"UsageName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HasProperties": {
					"type": "IfcProperty",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcCompositeCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcBoundedCurve"],
			"fields": {
				"Segments": {
					"type": "IfcCompositeCurveSegment",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"SelfIntersect": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCompositeCurveSegment": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Transition": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SameSense": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ParentCurve": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"UsingCurves": {
					"type": "IfcCompositeCurve",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCompositeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcProfileDef"],
			"fields": {
				"Profiles": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Label": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCompressorType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowMovingDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCondenserType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCondition": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": ["IfcGroup"],
			"fields": {}
		},
		"IfcConditionCriterion": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": ["IfcControl"],
			"fields": {
				"Criterion": {
					"type": "IfcConditionCriterionSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CriterionDateTime": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConic": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCurve"],
			"fields": {
				"Position": {
					"type": "IfcAxis2Placement",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConnectedFaceSet": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcTopologicalRepresentationItem"],
			"fields": {
				"CfsFaces": {
					"type": "IfcFace",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcConnectionCurveGeometry": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": ["IfcConnectionGeometry"],
			"fields": {
				"CurveOnRelatingElement": {
					"type": "IfcCurveOrEdgeCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CurveOnRelatedElement": {
					"type": "IfcCurveOrEdgeCurve",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConnectionGeometry": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcConnectionPointEccentricity": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": ["IfcConnectionPointGeometry"],
			"fields": {
				"EccentricityInX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EccentricityInXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EccentricityInY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EccentricityInYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EccentricityInZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EccentricityInZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConnectionPointGeometry": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": ["IfcConnectionGeometry"],
			"fields": {
				"PointOnRelatingElement": {
					"type": "IfcPointOrVertexPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PointOnRelatedElement": {
					"type": "IfcPointOrVertexPoint",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConnectionPortGeometry": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": ["IfcConnectionGeometry"],
			"fields": {
				"LocationAtRelatingElement": {
					"type": "IfcAxis2Placement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LocationAtRelatedElement": {
					"type": "IfcAxis2Placement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ProfileOfPort": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConnectionSurfaceGeometry": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": ["IfcConnectionGeometry"],
			"fields": {
				"SurfaceOnRelatingElement": {
					"type": "IfcSurfaceOrFaceSurface",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SurfaceOnRelatedElement": {
					"type": "IfcSurfaceOrFaceSurface",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConstraint": {
			"domain": "ifcconstraintresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConstraintGrade": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConstraintSource": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CreatingActor": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CreationTime": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"UserDefinedGrade": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ClassifiedAs": {
					"type": "IfcConstraintClassificationRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"RelatesConstraints": {
					"type": "IfcConstraintRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsRelatedWith": {
					"type": "IfcConstraintRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"PropertiesForConstraint": {
					"type": "IfcPropertyConstraintRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Aggregates": {
					"type": "IfcConstraintAggregationRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsAggregatedIn": {
					"type": "IfcConstraintAggregationRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcConstraintAggregationRelationship": {
			"domain": "ifcconstraintresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RelatingConstraint": {
					"type": "IfcConstraint",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedConstraints": {
					"type": "IfcConstraint",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"LogicalAggregator": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConstraintClassificationRelationship": {
			"domain": "ifcconstraintresource",
			"superclasses": [],
			"fields": {
				"ClassifiedConstraint": {
					"type": "IfcConstraint",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedClassifications": {
					"type": "IfcClassificationNotationSelect",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcConstraintRelationship": {
			"domain": "ifcconstraintresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RelatingConstraint": {
					"type": "IfcConstraint",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedConstraints": {
					"type": "IfcConstraint",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcConstructionEquipmentResource": {
			"domain": "ifcconstructionmgmtdomain",
			"superclasses": ["IfcConstructionResource"],
			"fields": {}
		},
		"IfcConstructionMaterialResource": {
			"domain": "ifcconstructionmgmtdomain",
			"superclasses": ["IfcConstructionResource"],
			"fields": {
				"Suppliers": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"UsageRatio": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UsageRatioAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConstructionProductResource": {
			"domain": "ifcconstructionmgmtdomain",
			"superclasses": ["IfcConstructionResource"],
			"fields": {}
		},
		"IfcConstructionResource": {
			"domain": "ifcconstructionmgmtdomain",
			"superclasses": ["IfcResource"],
			"fields": {
				"ResourceIdentifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ResourceGroup": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ResourceConsumption": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseQuantity": {
					"type": "IfcMeasureWithUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcContextDependentUnit": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcNamedUnit"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcControl": {
			"domain": "ifckernel",
			"superclasses": ["IfcObject"],
			"fields": {
				"Controls": {
					"type": "IfcRelAssignsToControl",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcControllerType": {
			"domain": "ifcbuildingcontrolsdomain",
			"superclasses": ["IfcDistributionControlElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcConversionBasedUnit": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcNamedUnit"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConversionFactor": {
					"type": "IfcMeasureWithUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCooledBeamType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCoolingTowerType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCoordinatedUniversalTimeOffset": {
			"domain": "ifcdatetimeresource",
			"superclasses": [],
			"fields": {
				"HourOffset": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinuteOffset": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Sense": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCostItem": {
			"domain": "ifcsharedmgmtelements",
			"superclasses": ["IfcControl"],
			"fields": {}
		},
		"IfcCostSchedule": {
			"domain": "ifcsharedmgmtelements",
			"superclasses": ["IfcControl"],
			"fields": {
				"SubmittedBy": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PreparedBy": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SubmittedOn": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Status": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TargetUsers": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"UpdateDate": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ID": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCostValue": {
			"domain": "ifccostresource",
			"superclasses": ["IfcAppliedValue", "IfcMetricValueSelect"],
			"fields": {
				"CostType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Condition": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCovering": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CoversSpaces": {
					"type": "IfcRelCoversSpaces",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Covers": {
					"type": "IfcRelCoversBldgElements",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcCoveringType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCraneRailAShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"OverallHeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallHeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseWidth2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseWidth2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadDepth2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadDepth2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadDepth3": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadDepth3AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseWidth4": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseWidth4AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth1": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth1AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth3": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth3AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCraneRailFShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"OverallHeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallHeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadDepth2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadDepth2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadDepth3": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeadDepth3AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth1": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth1AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BaseDepth2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCrewResource": {
			"domain": "ifcconstructionmgmtdomain",
			"superclasses": ["IfcConstructionResource"],
			"fields": {}
		},
		"IfcCsgPrimitive3D": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcBooleanOperand", "IfcCsgSelect"],
			"fields": {
				"Position": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCsgSolid": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcSolidModel"],
			"fields": {
				"TreeRootExpression": {
					"type": "IfcCsgSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCurrencyRelationship": {
			"domain": "ifccostresource",
			"superclasses": [],
			"fields": {
				"RelatingMonetaryUnit": {
					"type": "IfcMonetaryUnit",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"RelatedMonetaryUnit": {
					"type": "IfcMonetaryUnit",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ExchangeRate": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ExchangeRateAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RateDateTime": {
					"type": "IfcDateAndTime",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"RateSource": {
					"type": "IfcLibraryInformation",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCurtainWall": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {}
		},
		"IfcCurtainWallType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcGeometricSetSelect"],
			"fields": {
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCurveBoundedPlane": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcBoundedSurface"],
			"fields": {
				"BasisSurface": {
					"type": "IfcPlane",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"OuterBoundary": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"InnerBoundaries": {
					"type": "IfcCurve",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCurveStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcPresentationStyle", "IfcPresentationStyleSelect"],
			"fields": {
				"CurveFont": {
					"type": "IfcCurveFontOrScaledCurveFontSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CurveWidth": {
					"type": "IfcSizeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CurveColour": {
					"type": "IfcColour",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCurveStyleFont": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcCurveStyleFontSelect"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PatternList": {
					"type": "IfcCurveStyleFontPattern",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcCurveStyleFontAndScaling": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcCurveFontOrScaledCurveFontSelect"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CurveFont": {
					"type": "IfcCurveStyleFontSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CurveFontScaling": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CurveFontScalingAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCurveStyleFontPattern": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {
				"VisibleSegmentLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VisibleSegmentLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InvisibleSegmentLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InvisibleSegmentLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDamperType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowControllerType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDateAndTime": {
			"domain": "ifcdatetimeresource",
			"superclasses": ["IfcDateTimeSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"DateComponent": {
					"type": "IfcCalendarDate",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TimeComponent": {
					"type": "IfcLocalTime",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDefinedSymbol": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Definition": {
					"type": "IfcDefinedSymbolSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Target": {
					"type": "IfcCartesianTransformationOperator2D",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDerivedProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcProfileDef"],
			"fields": {
				"ParentProfile": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Operator": {
					"type": "IfcCartesianTransformationOperator2D",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Label": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDerivedUnit": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcUnit"],
			"fields": {
				"Elements": {
					"type": "IfcDerivedUnitElement",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"UnitType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDerivedUnitElement": {
			"domain": "ifcmeasureresource",
			"superclasses": [],
			"fields": {
				"Unit": {
					"type": "IfcNamedUnit",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Exponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDiameterDimension": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcDimensionCurveDirectedCallout"],
			"fields": {}
		},
		"IfcDimensionCalloutRelationship": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcDraughtingCalloutRelationship"],
			"fields": {}
		},
		"IfcDimensionCurve": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcAnnotationCurveOccurrence"],
			"fields": {
				"AnnotatedBySymbols": {
					"type": "IfcTerminatorSymbol",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcDimensionCurveDirectedCallout": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcDraughtingCallout"],
			"fields": {}
		},
		"IfcDimensionCurveTerminator": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcTerminatorSymbol"],
			"fields": {
				"Role": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDimensionPair": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcDraughtingCalloutRelationship"],
			"fields": {}
		},
		"IfcDimensionalExponents": {
			"domain": "ifcmeasureresource",
			"superclasses": [],
			"fields": {
				"LengthExponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MassExponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TimeExponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ElectricCurrentExponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermodynamicTemperatureExponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AmountOfSubstanceExponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LuminousIntensityExponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDirection": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcOrientationSelect", "IfcVectorOrDirection"],
			"fields": {
				"DirectionRatios": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"DirectionRatiosAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDiscreteAccessory": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcElementComponent"],
			"fields": {}
		},
		"IfcDiscreteAccessoryType": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcElementComponentType"],
			"fields": {}
		},
		"IfcDistributionChamberElement": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcDistributionChamberElementType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDistributionControlElement": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionElement"],
			"fields": {
				"ControlElementId": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AssignedToFlowElement": {
					"type": "IfcRelFlowControlElements",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcDistributionControlElementType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionElementType"],
			"fields": {}
		},
		"IfcDistributionElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {}
		},
		"IfcDistributionElementType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElementType"],
			"fields": {}
		},
		"IfcDistributionFlowElement": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionElement"],
			"fields": {
				"HasControlElements": {
					"type": "IfcRelFlowControlElements",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcDistributionFlowElementType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionElementType"],
			"fields": {}
		},
		"IfcDistributionPort": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcPort"],
			"fields": {
				"FlowDirection": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDocumentElectronicFormat": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {
				"FileExtension": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MimeContentType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MimeSubtype": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDocumentInformation": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": ["IfcDocumentSelect"],
			"fields": {
				"DocumentId": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DocumentReferences": {
					"type": "IfcDocumentReference",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Purpose": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IntendedUse": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Scope": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Revision": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DocumentOwner": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Editors": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"CreationTime": {
					"type": "IfcDateAndTime",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LastRevisionTime": {
					"type": "IfcDateAndTime",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ElectronicFormat": {
					"type": "IfcDocumentElectronicFormat",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ValidFrom": {
					"type": "IfcCalendarDate",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ValidUntil": {
					"type": "IfcCalendarDate",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Confidentiality": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Status": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IsPointedTo": {
					"type": "IfcDocumentInformationRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsPointer": {
					"type": "IfcDocumentInformationRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcDocumentInformationRelationship": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {
				"RelatingDocument": {
					"type": "IfcDocumentInformation",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedDocuments": {
					"type": "IfcDocumentInformation",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"RelationshipType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDocumentReference": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": ["IfcExternalReference", "IfcDocumentSelect"],
			"fields": {
				"ReferenceToDocument": {
					"type": "IfcDocumentInformation",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcDoor": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"OverallHeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallHeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDoorLiningProperties": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"LiningDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LiningDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LiningThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LiningThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThresholdDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThresholdDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThresholdThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThresholdThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransomThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransomThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransomOffset": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransomOffsetAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LiningOffset": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LiningOffsetAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThresholdOffset": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThresholdOffsetAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CasingThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CasingThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CasingDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CasingDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShapeAspectStyle": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDoorPanelProperties": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"PanelDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PanelDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PanelOperation": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PanelWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PanelWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PanelPosition": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShapeAspectStyle": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDoorStyle": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcTypeProduct"],
			"fields": {
				"OperationType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConstructionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ParameterTakesPrecedence": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Sizeable": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDraughtingCallout": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Contents": {
					"type": "IfcDraughtingCalloutElement",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"IsRelatedFromCallout": {
					"type": "IfcDraughtingCalloutRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsRelatedToCallout": {
					"type": "IfcDraughtingCalloutRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcDraughtingCalloutRelationship": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RelatingDraughtingCallout": {
					"type": "IfcDraughtingCallout",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedDraughtingCallout": {
					"type": "IfcDraughtingCallout",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcDraughtingPreDefinedColour": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcPreDefinedColour"],
			"fields": {}
		},
		"IfcDraughtingPreDefinedCurveFont": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcPreDefinedCurveFont"],
			"fields": {}
		},
		"IfcDraughtingPreDefinedTextFont": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcPreDefinedTextFont"],
			"fields": {}
		},
		"IfcDuctFittingType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowFittingType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDuctSegmentType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowSegmentType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDuctSilencerType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowTreatmentDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEdge": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcTopologicalRepresentationItem"],
			"fields": {
				"EdgeStart": {
					"type": "IfcVertex",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"EdgeEnd": {
					"type": "IfcVertex",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEdgeCurve": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcEdge", "IfcCurveOrEdgeCurve"],
			"fields": {
				"EdgeGeometry": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SameSense": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEdgeFeature": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcFeatureElementSubtraction"],
			"fields": {
				"FeatureLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FeatureLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEdgeLoop": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcLoop"],
			"fields": {
				"EdgeList": {
					"type": "IfcOrientedEdge",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcElectricApplianceType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricDistributionPoint": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowController"],
			"fields": {
				"DistributionPointFunction": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedFunction": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricFlowStorageDeviceType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowStorageDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricGeneratorType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricHeaterType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricMotorType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricTimeControlType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowControllerType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricalBaseProperties": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcEnergyProperties"],
			"fields": {
				"ElectricCurrentType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InputVoltage": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InputVoltageAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InputFrequency": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InputFrequencyAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FullLoadCurrent": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FullLoadCurrentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumCircuitCurrent": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumCircuitCurrentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumPowerInput": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumPowerInputAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RatedPowerInput": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RatedPowerInputAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InputPhase": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricalCircuit": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcSystem"],
			"fields": {}
		},
		"IfcElectricalElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {}
		},
		"IfcElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcProduct", "IfcStructuralActivityAssignmentSelect"],
			"fields": {
				"Tag": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HasStructuralMember": {
					"type": "IfcRelConnectsStructuralElement",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"FillsVoids": {
					"type": "IfcRelFillsElement",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ConnectedTo": {
					"type": "IfcRelConnectsElements",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasCoverings": {
					"type": "IfcRelCoversBldgElements",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasProjections": {
					"type": "IfcRelProjectsElement",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ReferencedInStructures": {
					"type": "IfcRelReferencedInSpatialStructure",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasPorts": {
					"type": "IfcRelConnectsPortToElement",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasOpenings": {
					"type": "IfcRelVoidsElement",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsConnectionRealization": {
					"type": "IfcRelConnectsWithRealizingElements",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ProvidesBoundaries": {
					"type": "IfcRelSpaceBoundary",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ConnectedFrom": {
					"type": "IfcRelConnectsElements",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ContainedInStructure": {
					"type": "IfcRelContainedInSpatialStructure",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcElementAssembly": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {
				"AssemblyPlace": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElementComponent": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcElement"],
			"fields": {}
		},
		"IfcElementComponentType": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcElementType"],
			"fields": {}
		},
		"IfcElementQuantity": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"MethodOfMeasurement": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Quantities": {
					"type": "IfcPhysicalQuantity",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcElementType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcTypeProduct"],
			"fields": {
				"ElementType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElementarySurface": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcSurface"],
			"fields": {
				"Position": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEllipse": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcConic"],
			"fields": {
				"SemiAxis1": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SemiAxis1AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SemiAxis2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SemiAxis2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEllipseProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"SemiAxis1": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SemiAxis1AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SemiAxis2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SemiAxis2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEnergyConversionDevice": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcEnergyConversionDeviceType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {}
		},
		"IfcEnergyProperties": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"EnergySequence": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedEnergySequence": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEnvironmentalImpactValue": {
			"domain": "ifccostresource",
			"superclasses": ["IfcAppliedValue"],
			"fields": {
				"ImpactType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Category": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedCategory": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEquipmentElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {}
		},
		"IfcEquipmentStandard": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": ["IfcControl"],
			"fields": {}
		},
		"IfcEvaporativeCoolerType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEvaporatorType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcExtendedMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"ExtendedProperties": {
					"type": "IfcProperty",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcExternalReference": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": ["IfcLightDistributionDataSourceSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"Location": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ItemReference": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcExternallyDefinedHatchStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcExternalReference", "IfcFillStyleSelect"],
			"fields": {}
		},
		"IfcExternallyDefinedSurfaceStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcExternalReference", "IfcSurfaceStyleElementSelect"],
			"fields": {}
		},
		"IfcExternallyDefinedSymbol": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcExternalReference", "IfcDefinedSymbolSelect"],
			"fields": {}
		},
		"IfcExternallyDefinedTextFont": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcExternalReference", "IfcTextFontSelect"],
			"fields": {}
		},
		"IfcExtrudedAreaSolid": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcSweptAreaSolid"],
			"fields": {
				"ExtrudedDirection": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Depth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFace": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcTopologicalRepresentationItem"],
			"fields": {
				"Bounds": {
					"type": "IfcFaceBound",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcFaceBasedSurfaceModel": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcSurfaceOrFaceSurface"],
			"fields": {
				"FbsmFaces": {
					"type": "IfcConnectedFaceSet",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFaceBound": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcTopologicalRepresentationItem"],
			"fields": {
				"Bound": {
					"type": "IfcLoop",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Orientation": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFaceOuterBound": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcFaceBound"],
			"fields": {}
		},
		"IfcFaceSurface": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcFace", "IfcSurfaceOrFaceSurface"],
			"fields": {
				"FaceSurface": {
					"type": "IfcSurface",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SameSense": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFacetedBrep": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcManifoldSolidBrep"],
			"fields": {}
		},
		"IfcFacetedBrepWithVoids": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcManifoldSolidBrep"],
			"fields": {
				"Voids": {
					"type": "IfcClosedShell",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcFailureConnectionCondition": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralConnectionCondition"],
			"fields": {
				"TensionFailureX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TensionFailureXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TensionFailureY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TensionFailureYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TensionFailureZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TensionFailureZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompressionFailureX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompressionFailureXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompressionFailureY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompressionFailureYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompressionFailureZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompressionFailureZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFanType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowMovingDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFastener": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcElementComponent"],
			"fields": {}
		},
		"IfcFastenerType": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcElementComponentType"],
			"fields": {}
		},
		"IfcFeatureElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {}
		},
		"IfcFeatureElementAddition": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcFeatureElement"],
			"fields": {
				"ProjectsElements": {
					"type": "IfcRelProjectsElement",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcFeatureElementSubtraction": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcFeatureElement"],
			"fields": {
				"VoidsElements": {
					"type": "IfcRelVoidsElement",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcFillAreaStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcPresentationStyle", "IfcPresentationStyleSelect"],
			"fields": {
				"FillStyles": {
					"type": "IfcFillStyleSelect",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcFillAreaStyleHatching": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcFillStyleSelect"],
			"fields": {
				"HatchLineAppearance": {
					"type": "IfcCurveStyle",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"StartOfNextHatchLine": {
					"type": "IfcHatchLineDistanceSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PointOfReferenceHatchLine": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PatternStart": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"HatchLineAngle": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HatchLineAngleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFillAreaStyleTileSymbolWithStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcFillAreaStyleTileShapeSelect"],
			"fields": {
				"Symbol": {
					"type": "IfcAnnotationSymbolOccurrence",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFillAreaStyleTiles": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcFillStyleSelect"],
			"fields": {
				"TilingPattern": {
					"type": "IfcOneDirectionRepeatFactor",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Tiles": {
					"type": "IfcFillAreaStyleTileShapeSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"TilingScale": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TilingScaleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFilterType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowTreatmentDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFireSuppressionTerminalType": {
			"domain": "ifcplumbingfireprotectiondomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFlowController": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcFlowControllerType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {}
		},
		"IfcFlowFitting": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcFlowFittingType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {}
		},
		"IfcFlowInstrumentType": {
			"domain": "ifcbuildingcontrolsdomain",
			"superclasses": ["IfcDistributionControlElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFlowMeterType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowControllerType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFlowMovingDevice": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcFlowMovingDeviceType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {}
		},
		"IfcFlowSegment": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcFlowSegmentType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {}
		},
		"IfcFlowStorageDevice": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcFlowStorageDeviceType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {}
		},
		"IfcFlowTerminal": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcFlowTerminalType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {}
		},
		"IfcFlowTreatmentDevice": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElement"],
			"fields": {}
		},
		"IfcFlowTreatmentDeviceType": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcDistributionFlowElementType"],
			"fields": {}
		},
		"IfcFluidFlowProperties": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"PropertySource": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlowConditionTimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"VelocityTimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"FlowrateTimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Fluid": {
					"type": "IfcMaterial",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PressureTimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"UserDefinedPropertySource": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TemperatureSingleValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TemperatureSingleValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WetBulbTemperatureSingleValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WetBulbTemperatureSingleValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WetBulbTemperatureTimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TemperatureTimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"FlowrateSingleValue": {
					"type": "IfcDerivedMeasureValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"FlowConditionSingleValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlowConditionSingleValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VelocitySingleValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VelocitySingleValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PressureSingleValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PressureSingleValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFooting": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFuelProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"CombustionTemperature": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CombustionTemperatureAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CarbonContent": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CarbonContentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LowerHeatingValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LowerHeatingValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HigherHeatingValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HigherHeatingValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFurnishingElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {}
		},
		"IfcFurnishingElementType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElementType"],
			"fields": {}
		},
		"IfcFurnitureStandard": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": ["IfcControl"],
			"fields": {}
		},
		"IfcFurnitureType": {
			"domain": "ifcsharedfacilitieselements",
			"superclasses": ["IfcFurnishingElementType"],
			"fields": {
				"AssemblyPlace": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcGasTerminalType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcGeneralMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"MolecularWeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MolecularWeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Porosity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PorosityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MassDensity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MassDensityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcGeneralProfileProperties": {
			"domain": "ifcprofilepropertyresource",
			"superclasses": ["IfcProfileProperties"],
			"fields": {
				"PhysicalWeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PhysicalWeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Perimeter": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PerimeterAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumPlateThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumPlateThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumPlateThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumPlateThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CrossSectionArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CrossSectionAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcGeometricCurveSet": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricSet"],
			"fields": {}
		},
		"IfcGeometricRepresentationContext": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcRepresentationContext"],
			"fields": {
				"CoordinateSpaceDimension": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Precision": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PrecisionAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WorldCoordinateSystem": {
					"type": "IfcAxis2Placement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TrueNorth": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"HasSubContexts": {
					"type": "IfcGeometricRepresentationSubContext",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcGeometricRepresentationItem": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcRepresentationItem"],
			"fields": {}
		},
		"IfcGeometricRepresentationSubContext": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcGeometricRepresentationContext"],
			"fields": {
				"ParentContext": {
					"type": "IfcGeometricRepresentationContext",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"TargetScale": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TargetScaleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TargetView": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedTargetView": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcGeometricSet": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Elements": {
					"type": "IfcGeometricSetSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcGrid": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcProduct"],
			"fields": {
				"UAxes": {
					"type": "IfcGridAxis",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"VAxes": {
					"type": "IfcGridAxis",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"WAxes": {
					"type": "IfcGridAxis",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ContainedInStructure": {
					"type": "IfcRelContainedInSpatialStructure",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcGridAxis": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": [],
			"fields": {
				"AxisTag": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AxisCurve": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SameSense": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PartOfW": {
					"type": "IfcGrid",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"PartOfV": {
					"type": "IfcGrid",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"PartOfU": {
					"type": "IfcGrid",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasIntersections": {
					"type": "IfcVirtualGridIntersection",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcGridPlacement": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": ["IfcObjectPlacement"],
			"fields": {
				"PlacementLocation": {
					"type": "IfcVirtualGridIntersection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PlacementRefDirection": {
					"type": "IfcVirtualGridIntersection",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcGroup": {
			"domain": "ifckernel",
			"superclasses": ["IfcObject"],
			"fields": {
				"IsGroupedBy": {
					"type": "IfcRelAssignsToGroup",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcHalfSpaceSolid": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcBooleanOperand"],
			"fields": {
				"BaseSurface": {
					"type": "IfcSurface",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"AgreementFlag": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcHeatExchangerType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcHumidifierType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcHygroscopicMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"UpperVaporResistanceFactor": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UpperVaporResistanceFactorAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LowerVaporResistanceFactor": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LowerVaporResistanceFactorAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IsothermalMoistureCapacity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IsothermalMoistureCapacityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VaporPermeability": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VaporPermeabilityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MoistureDiffusivity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MoistureDiffusivityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcIShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"OverallWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcImageTexture": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSurfaceTexture"],
			"fields": {
				"UrlReference": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcInventory": {
			"domain": "ifcsharedfacilitieselements",
			"superclasses": ["IfcGroup"],
			"fields": {
				"InventoryType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Jurisdiction": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ResponsiblePersons": {
					"type": "IfcPerson",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"LastUpdateDate": {
					"type": "IfcCalendarDate",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CurrentValue": {
					"type": "IfcCostValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"OriginalValue": {
					"type": "IfcCostValue",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcIrregularTimeSeries": {
			"domain": "ifctimeseriesresource",
			"superclasses": ["IfcTimeSeries"],
			"fields": {
				"Values": {
					"type": "IfcIrregularTimeSeriesValue",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcIrregularTimeSeriesValue": {
			"domain": "ifctimeseriesresource",
			"superclasses": [],
			"fields": {
				"TimeStamp": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ListValues": {
					"type": "IfcValue",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcJunctionBoxType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowFittingType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"Depth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Width": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Thickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EdgeRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EdgeRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LegSlope": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LegSlopeAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLaborResource": {
			"domain": "ifcconstructionmgmtdomain",
			"superclasses": ["IfcConstructionResource"],
			"fields": {
				"SkillSet": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLampType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLibraryInformation": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": ["IfcLibrarySelect"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Version": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Publisher": {
					"type": "IfcOrganization",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"VersionDate": {
					"type": "IfcCalendarDate",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LibraryReference": {
					"type": "IfcLibraryReference",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcLibraryReference": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": ["IfcExternalReference", "IfcLibrarySelect"],
			"fields": {
				"ReferenceIntoLibrary": {
					"type": "IfcLibraryInformation",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcLightDistributionData": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": [],
			"fields": {
				"MainPlaneAngle": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MainPlaneAngleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SecondaryPlaneAngle": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"SecondaryPlaneAngleAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"LuminousIntensity": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"LuminousIntensityAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcLightFixtureType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLightIntensityDistribution": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": ["IfcLightDistributionDataSourceSelect"],
			"fields": {
				"LightDistributionCurve": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DistributionData": {
					"type": "IfcLightDistributionData",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcLightSource": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LightColour": {
					"type": "IfcColourRgb",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"AmbientIntensity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AmbientIntensityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Intensity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IntensityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLightSourceAmbient": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": ["IfcLightSource"],
			"fields": {}
		},
		"IfcLightSourceDirectional": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": ["IfcLightSource"],
			"fields": {
				"Orientation": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLightSourceGoniometric": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": ["IfcLightSource"],
			"fields": {
				"Position": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ColourAppearance": {
					"type": "IfcColourRgb",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ColourTemperature": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ColourTemperatureAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LuminousFlux": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LuminousFluxAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LightEmissionSource": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LightDistributionDataSource": {
					"type": "IfcLightDistributionDataSourceSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLightSourcePositional": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": ["IfcLightSource"],
			"fields": {
				"Position": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConstantAttenuation": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConstantAttenuationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DistanceAttenuation": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DistanceAttenuationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"QuadricAttenuation": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"QuadricAttenuationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLightSourceSpot": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": ["IfcLightSourcePositional"],
			"fields": {
				"Orientation": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ConcentrationExponent": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConcentrationExponentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SpreadAngle": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SpreadAngleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BeamWidthAngle": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BeamWidthAngleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLine": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCurve"],
			"fields": {
				"Pnt": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Dir": {
					"type": "IfcVector",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLinearDimension": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcDimensionCurveDirectedCallout"],
			"fields": {}
		},
		"IfcLocalPlacement": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": ["IfcObjectPlacement"],
			"fields": {
				"PlacementRelTo": {
					"type": "IfcObjectPlacement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelativePlacement": {
					"type": "IfcAxis2Placement",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLocalTime": {
			"domain": "ifcdatetimeresource",
			"superclasses": ["IfcDateTimeSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"HourComponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinuteComponent": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SecondComponent": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SecondComponentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Zone": {
					"type": "IfcCoordinatedUniversalTimeOffset",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"DaylightSavingOffset": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLoop": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcTopologicalRepresentationItem"],
			"fields": {}
		},
		"IfcManifoldSolidBrep": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcSolidModel"],
			"fields": {
				"Outer": {
					"type": "IfcClosedShell",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMappedItem": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcRepresentationItem"],
			"fields": {
				"MappingSource": {
					"type": "IfcRepresentationMap",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"MappingTarget": {
					"type": "IfcCartesianTransformationOperator",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMaterial": {
			"domain": "ifcmaterialresource",
			"superclasses": ["IfcMaterialSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HasRepresentation": {
					"type": "IfcMaterialDefinitionRepresentation",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ClassifiedAs": {
					"type": "IfcMaterialClassificationRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcMaterialClassificationRelationship": {
			"domain": "ifcmaterialresource",
			"superclasses": [],
			"fields": {
				"MaterialClassifications": {
					"type": "IfcClassificationNotationSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"ClassifiedMaterial": {
					"type": "IfcMaterial",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcMaterialDefinitionRepresentation": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcProductRepresentation"],
			"fields": {
				"RepresentedMaterial": {
					"type": "IfcMaterial",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcMaterialLayer": {
			"domain": "ifcmaterialresource",
			"superclasses": ["IfcMaterialSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"Material": {
					"type": "IfcMaterial",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LayerThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LayerThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IsVentilated": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ToMaterialLayerSet": {
					"type": "IfcMaterialLayerSet",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcMaterialLayerSet": {
			"domain": "ifcmaterialresource",
			"superclasses": ["IfcMaterialSelect"],
			"fields": {
				"MaterialLayers": {
					"type": "IfcMaterialLayer",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"LayerSetName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TotalThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TotalThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMaterialLayerSetUsage": {
			"domain": "ifcmaterialresource",
			"superclasses": ["IfcMaterialSelect"],
			"fields": {
				"ForLayerSet": {
					"type": "IfcMaterialLayerSet",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LayerSetDirection": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DirectionSense": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OffsetFromReferenceLine": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OffsetFromReferenceLineAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMaterialList": {
			"domain": "ifcmaterialresource",
			"superclasses": ["IfcMaterialSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"Materials": {
					"type": "IfcMaterial",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": [],
			"fields": {
				"Material": {
					"type": "IfcMaterial",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMeasureWithUnit": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcAppliedValueSelect", "IfcConditionCriterionSelect", "IfcMetricValueSelect"],
			"fields": {
				"ValueComponent": {
					"type": "IfcValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"UnitComponent": {
					"type": "IfcUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMechanicalConcreteMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMechanicalMaterialProperties"],
			"fields": {
				"CompressiveStrength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompressiveStrengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaxAggregateSize": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaxAggregateSizeAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AdmixturesDescription": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Workability": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ProtectivePoreRatio": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ProtectivePoreRatioAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WaterImpermeability": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMechanicalFastener": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcFastener"],
			"fields": {
				"NominalDiameter": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NominalDiameterAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NominalLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NominalLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMechanicalFastenerType": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcFastenerType"],
			"fields": {}
		},
		"IfcMechanicalMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"DynamicViscosity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DynamicViscosityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YoungModulus": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YoungModulusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearModulus": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearModulusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PoissonRatio": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PoissonRatioAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalExpansionCoefficient": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalExpansionCoefficientAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMechanicalSteelMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMechanicalMaterialProperties"],
			"fields": {
				"YieldStress": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YieldStressAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UltimateStress": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UltimateStressAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UltimateStrain": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UltimateStrainAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HardeningModule": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HardeningModuleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ProportionalStress": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ProportionalStressAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlasticStrain": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlasticStrainAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Relaxations": {
					"type": "IfcRelaxation",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcMember": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {}
		},
		"IfcMemberType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMetric": {
			"domain": "ifcconstraintresource",
			"superclasses": ["IfcConstraint"],
			"fields": {
				"Benchmark": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ValueSource": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DataValue": {
					"type": "IfcMetricValueSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMonetaryUnit": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcUnit"],
			"fields": {
				"Currency": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMotorConnectionType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMove": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": ["IfcTask"],
			"fields": {
				"MoveFrom": {
					"type": "IfcSpatialStructureElement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"MoveTo": {
					"type": "IfcSpatialStructureElement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PunchList": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcNamedUnit": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcUnit"],
			"fields": {
				"Dimensions": {
					"type": "IfcDimensionalExponents",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"UnitType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcObject": {
			"domain": "ifckernel",
			"superclasses": ["IfcObjectDefinition"],
			"fields": {
				"ObjectType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IsDefinedBy": {
					"type": "IfcRelDefines",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcObjectDefinition": {
			"domain": "ifckernel",
			"superclasses": ["IfcRoot"],
			"fields": {
				"HasAssignments": {
					"type": "IfcRelAssigns",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsDecomposedBy": {
					"type": "IfcRelDecomposes",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Decomposes": {
					"type": "IfcRelDecomposes",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasAssociations": {
					"type": "IfcRelAssociates",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcObjectPlacement": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": [],
			"fields": {
				"PlacesObject": {
					"type": "IfcProduct",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ReferencedByPlacements": {
					"type": "IfcLocalPlacement",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcObjective": {
			"domain": "ifcconstraintresource",
			"superclasses": ["IfcConstraint"],
			"fields": {
				"BenchmarkValues": {
					"type": "IfcMetric",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ResultValues": {
					"type": "IfcMetric",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ObjectiveQualifier": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedQualifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOccupant": {
			"domain": "ifcsharedfacilitieselements",
			"superclasses": ["IfcActor"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOffsetCurve2D": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCurve"],
			"fields": {
				"BasisCurve": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Distance": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DistanceAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SelfIntersect": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOffsetCurve3D": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcCurve"],
			"fields": {
				"BasisCurve": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Distance": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DistanceAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SelfIntersect": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RefDirection": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOneDirectionRepeatFactor": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcHatchLineDistanceSelect"],
			"fields": {
				"RepeatFactor": {
					"type": "IfcVector",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOpenShell": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcConnectedFaceSet", "IfcShell"],
			"fields": {}
		},
		"IfcOpeningElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcFeatureElementSubtraction"],
			"fields": {
				"HasFillings": {
					"type": "IfcRelFillsElement",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcOpticalMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"VisibleTransmittance": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VisibleTransmittanceAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SolarTransmittance": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SolarTransmittanceAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalIrTransmittance": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalIrTransmittanceAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalIrEmissivityBack": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalIrEmissivityBackAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalIrEmissivityFront": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalIrEmissivityFrontAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VisibleReflectanceBack": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VisibleReflectanceBackAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VisibleReflectanceFront": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VisibleReflectanceFrontAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SolarReflectanceFront": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SolarReflectanceFrontAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SolarReflectanceBack": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SolarReflectanceBackAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOrderAction": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": ["IfcTask"],
			"fields": {
				"ActionID": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOrganization": {
			"domain": "ifcactorresource",
			"superclasses": ["IfcActorSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"Id": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Roles": {
					"type": "IfcActorRole",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Addresses": {
					"type": "IfcAddress",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsRelatedBy": {
					"type": "IfcOrganizationRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Relates": {
					"type": "IfcOrganizationRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Engages": {
					"type": "IfcPersonAndOrganization",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcOrganizationRelationship": {
			"domain": "ifcactorresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RelatingOrganization": {
					"type": "IfcOrganization",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedOrganizations": {
					"type": "IfcOrganization",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcOrientedEdge": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcEdge"],
			"fields": {
				"EdgeElement": {
					"type": "IfcEdge",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Orientation": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOutletType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcOwnerHistory": {
			"domain": "ifcutilityresource",
			"superclasses": [],
			"fields": {
				"OwningUser": {
					"type": "IfcPersonAndOrganization",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"OwningApplication": {
					"type": "IfcApplication",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"State": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ChangeAction": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LastModifiedDate": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LastModifyingUser": {
					"type": "IfcPersonAndOrganization",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LastModifyingApplication": {
					"type": "IfcApplication",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CreationDate": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcParameterizedProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcProfileDef"],
			"fields": {
				"Position": {
					"type": "IfcAxis2Placement2D",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPath": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcTopologicalRepresentationItem"],
			"fields": {
				"EdgeList": {
					"type": "IfcOrientedEdge",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcPerformanceHistory": {
			"domain": "ifccontrolextension",
			"superclasses": ["IfcControl"],
			"fields": {
				"LifeCyclePhase": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPermeableCoveringProperties": {
			"domain": "ifcarchitecturedomain",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"OperationType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PanelPosition": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrameDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrameDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrameThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrameThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShapeAspectStyle": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPermit": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": ["IfcControl"],
			"fields": {
				"PermitID": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPerson": {
			"domain": "ifcactorresource",
			"superclasses": ["IfcActorSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"Id": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FamilyName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"GivenName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MiddleNames": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"PrefixTitles": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"SuffixTitles": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"Roles": {
					"type": "IfcActorRole",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Addresses": {
					"type": "IfcAddress",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"EngagedIn": {
					"type": "IfcPersonAndOrganization",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcPersonAndOrganization": {
			"domain": "ifcactorresource",
			"superclasses": ["IfcActorSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"ThePerson": {
					"type": "IfcPerson",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"TheOrganization": {
					"type": "IfcOrganization",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"Roles": {
					"type": "IfcActorRole",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcPhysicalComplexQuantity": {
			"domain": "ifcquantityresource",
			"superclasses": ["IfcPhysicalQuantity"],
			"fields": {
				"HasQuantities": {
					"type": "IfcPhysicalQuantity",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Discrimination": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Quality": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Usage": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPhysicalQuantity": {
			"domain": "ifcquantityresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PartOfComplex": {
					"type": "IfcPhysicalComplexQuantity",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcPhysicalSimpleQuantity": {
			"domain": "ifcquantityresource",
			"superclasses": ["IfcPhysicalQuantity"],
			"fields": {
				"Unit": {
					"type": "IfcNamedUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPile": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConstructionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPipeFittingType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowFittingType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPipeSegmentType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowSegmentType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPixelTexture": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSurfaceTexture"],
			"fields": {
				"Width": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Height": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ColourComponents": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Pixel": {
					"type": "bytearray",
					"reference": false,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcPlacement": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Location": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPlanarBox": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcPlanarExtent"],
			"fields": {
				"Placement": {
					"type": "IfcAxis2Placement",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPlanarExtent": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"SizeInX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SizeInXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SizeInY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SizeInYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPlane": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcElementarySurface"],
			"fields": {}
		},
		"IfcPlate": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {}
		},
		"IfcPlateType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPoint": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcGeometricSetSelect", "IfcPointOrVertexPoint"],
			"fields": {}
		},
		"IfcPointOnCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcPoint"],
			"fields": {
				"BasisCurve": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PointParameter": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PointParameterAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPointOnSurface": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcPoint"],
			"fields": {
				"BasisSurface": {
					"type": "IfcSurface",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PointParameterU": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PointParameterUAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PointParameterV": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PointParameterVAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPolyLoop": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcLoop"],
			"fields": {
				"Polygon": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcPolygonalBoundedHalfSpace": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcHalfSpaceSolid"],
			"fields": {
				"Position": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PolygonalBoundary": {
					"type": "IfcBoundedCurve",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPolyline": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcBoundedCurve"],
			"fields": {
				"Points": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcPort": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcProduct"],
			"fields": {
				"ContainedIn": {
					"type": "IfcRelConnectsPortToElement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"ConnectedFrom": {
					"type": "IfcRelConnectsPorts",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ConnectedTo": {
					"type": "IfcRelConnectsPorts",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcPostalAddress": {
			"domain": "ifcactorresource",
			"superclasses": ["IfcAddress"],
			"fields": {
				"InternalLocation": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AddressLines": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"PostalBox": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Town": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Region": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PostalCode": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Country": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPreDefinedColour": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcPreDefinedItem", "IfcColour"],
			"fields": {}
		},
		"IfcPreDefinedCurveFont": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcPreDefinedItem", "IfcCurveStyleFontSelect"],
			"fields": {}
		},
		"IfcPreDefinedDimensionSymbol": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcPreDefinedSymbol"],
			"fields": {}
		},
		"IfcPreDefinedItem": {
			"domain": "ifcpresentationresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPreDefinedPointMarkerSymbol": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcPreDefinedSymbol"],
			"fields": {}
		},
		"IfcPreDefinedSymbol": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcPreDefinedItem", "IfcDefinedSymbolSelect"],
			"fields": {}
		},
		"IfcPreDefinedTerminatorSymbol": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcPreDefinedSymbol"],
			"fields": {}
		},
		"IfcPreDefinedTextFont": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcPreDefinedItem", "IfcTextFontSelect"],
			"fields": {}
		},
		"IfcPresentationLayerAssignment": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AssignedItems": {
					"type": "IfcLayeredItem",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Identifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPresentationLayerWithStyle": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": ["IfcPresentationLayerAssignment"],
			"fields": {
				"LayerOn": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LayerFrozen": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LayerBlocked": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LayerStyles": {
					"type": "IfcPresentationStyleSelect",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcPresentationStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPresentationStyleAssignment": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {
				"Styles": {
					"type": "IfcPresentationStyleSelect",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcProcedure": {
			"domain": "ifcprocessextension",
			"superclasses": ["IfcProcess"],
			"fields": {
				"ProcedureID": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ProcedureType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedProcedureType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProcess": {
			"domain": "ifckernel",
			"superclasses": ["IfcObject"],
			"fields": {
				"OperatesOn": {
					"type": "IfcRelAssignsToProcess",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsSuccessorFrom": {
					"type": "IfcRelSequence",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"IsPredecessorTo": {
					"type": "IfcRelSequence",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcProduct": {
			"domain": "ifckernel",
			"superclasses": ["IfcObject"],
			"fields": {
				"ObjectPlacement": {
					"type": "IfcObjectPlacement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"Representation": {
					"type": "IfcProductRepresentation",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"ReferencedBy": {
					"type": "IfcRelAssignsToProduct",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"geometry": {
					"type": "GeometryInfo",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProductDefinitionShape": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcProductRepresentation"],
			"fields": {
				"ShapeOfProduct": {
					"type": "IfcProduct",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasShapeAspects": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcProductRepresentation": {
			"domain": "ifcrepresentationresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Representations": {
					"type": "IfcRepresentation",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcProductsOfCombustionProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"SpecificHeatCapacity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SpecificHeatCapacityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"N20Content": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"N20ContentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"COContent": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"COContentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CO2Content": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CO2ContentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": [],
			"fields": {
				"ProfileType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ProfileName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProfileProperties": {
			"domain": "ifcprofilepropertyresource",
			"superclasses": [],
			"fields": {
				"ProfileName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ProfileDefinition": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProject": {
			"domain": "ifckernel",
			"superclasses": ["IfcObject"],
			"fields": {
				"LongName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Phase": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RepresentationContexts": {
					"type": "IfcRepresentationContext",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"UnitsInContext": {
					"type": "IfcUnitAssignment",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProjectOrder": {
			"domain": "ifcsharedmgmtelements",
			"superclasses": ["IfcControl"],
			"fields": {
				"ID": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Status": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProjectOrderRecord": {
			"domain": "ifcsharedmgmtelements",
			"superclasses": ["IfcControl"],
			"fields": {
				"Records": {
					"type": "IfcRelAssignsToProjectOrder",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProjectionCurve": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcAnnotationCurveOccurrence"],
			"fields": {}
		},
		"IfcProjectionElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcFeatureElementAddition"],
			"fields": {}
		},
		"IfcProperty": {
			"domain": "ifcpropertyresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PropertyForDependance": {
					"type": "IfcPropertyDependencyRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"PropertyDependsOn": {
					"type": "IfcPropertyDependencyRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"PartOfComplex": {
					"type": "IfcComplexProperty",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcPropertyBoundedValue": {
			"domain": "ifcpropertyresource",
			"superclasses": ["IfcSimpleProperty"],
			"fields": {
				"UpperBoundValue": {
					"type": "IfcValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LowerBoundValue": {
					"type": "IfcValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Unit": {
					"type": "IfcUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPropertyConstraintRelationship": {
			"domain": "ifcconstraintresource",
			"superclasses": [],
			"fields": {
				"RelatingConstraint": {
					"type": "IfcConstraint",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedProperties": {
					"type": "IfcProperty",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPropertyDefinition": {
			"domain": "ifckernel",
			"superclasses": ["IfcRoot"],
			"fields": {
				"HasAssociations": {
					"type": "IfcRelAssociates",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcPropertyDependencyRelationship": {
			"domain": "ifcpropertyresource",
			"superclasses": [],
			"fields": {
				"DependingProperty": {
					"type": "IfcProperty",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"DependantProperty": {
					"type": "IfcProperty",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Expression": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPropertyEnumeratedValue": {
			"domain": "ifcpropertyresource",
			"superclasses": ["IfcSimpleProperty"],
			"fields": {
				"EnumerationValues": {
					"type": "IfcValue",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"EnumerationReference": {
					"type": "IfcPropertyEnumeration",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPropertyEnumeration": {
			"domain": "ifcpropertyresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EnumerationValues": {
					"type": "IfcValue",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Unit": {
					"type": "IfcUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPropertyListValue": {
			"domain": "ifcpropertyresource",
			"superclasses": ["IfcSimpleProperty"],
			"fields": {
				"ListValues": {
					"type": "IfcValue",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Unit": {
					"type": "IfcUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPropertyReferenceValue": {
			"domain": "ifcpropertyresource",
			"superclasses": ["IfcSimpleProperty"],
			"fields": {
				"UsageName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PropertyReference": {
					"type": "IfcObjectReferenceSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPropertySet": {
			"domain": "ifckernel",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"HasProperties": {
					"type": "IfcProperty",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcPropertySetDefinition": {
			"domain": "ifckernel",
			"superclasses": ["IfcPropertyDefinition"],
			"fields": {
				"PropertyDefinitionOf": {
					"type": "IfcRelDefinesByProperties",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"DefinesType": {
					"type": "IfcTypeObject",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcPropertySingleValue": {
			"domain": "ifcpropertyresource",
			"superclasses": ["IfcSimpleProperty"],
			"fields": {
				"NominalValue": {
					"type": "IfcValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Unit": {
					"type": "IfcUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPropertyTableValue": {
			"domain": "ifcpropertyresource",
			"superclasses": ["IfcSimpleProperty"],
			"fields": {
				"DefiningValues": {
					"type": "IfcValue",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"DefinedValues": {
					"type": "IfcValue",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Expression": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DefiningUnit": {
					"type": "IfcUnit",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"DefinedUnit": {
					"type": "IfcUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProtectiveDeviceType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowControllerType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcProxy": {
			"domain": "ifckernel",
			"superclasses": ["IfcProduct"],
			"fields": {
				"ProxyType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Tag": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPumpType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowMovingDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcQuantityArea": {
			"domain": "ifcquantityresource",
			"superclasses": ["IfcPhysicalSimpleQuantity"],
			"fields": {
				"AreaValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AreaValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcQuantityCount": {
			"domain": "ifcquantityresource",
			"superclasses": ["IfcPhysicalSimpleQuantity"],
			"fields": {
				"CountValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CountValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcQuantityLength": {
			"domain": "ifcquantityresource",
			"superclasses": ["IfcPhysicalSimpleQuantity"],
			"fields": {
				"LengthValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LengthValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcQuantityTime": {
			"domain": "ifcquantityresource",
			"superclasses": ["IfcPhysicalSimpleQuantity"],
			"fields": {
				"TimeValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TimeValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcQuantityVolume": {
			"domain": "ifcquantityresource",
			"superclasses": ["IfcPhysicalSimpleQuantity"],
			"fields": {
				"VolumeValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VolumeValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcQuantityWeight": {
			"domain": "ifcquantityresource",
			"superclasses": ["IfcPhysicalSimpleQuantity"],
			"fields": {
				"WeightValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WeightValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRadiusDimension": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcDimensionCurveDirectedCallout"],
			"fields": {}
		},
		"IfcRailing": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRailingType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRamp": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"ShapeType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRampFlight": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {}
		},
		"IfcRampFlightType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRationalBezierCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcBezierCurve"],
			"fields": {
				"WeightsData": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"WeightsDataAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcRectangleHollowProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcRectangleProfileDef"],
			"fields": {
				"WallThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WallThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InnerFilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InnerFilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OuterFilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OuterFilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRectangleProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"XDim": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"XDimAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YDim": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YDimAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRectangularPyramid": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcCsgPrimitive3D"],
			"fields": {
				"XLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"XLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Height": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRectangularTrimmedSurface": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcBoundedSurface"],
			"fields": {
				"BasisSurface": {
					"type": "IfcSurface",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"U1": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"U1AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"V1": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"V1AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"U2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"U2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"V2": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"V2AsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Usense": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Vsense": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcReferencesValueDocument": {
			"domain": "ifccostresource",
			"superclasses": [],
			"fields": {
				"ReferencedDocument": {
					"type": "IfcDocumentSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ReferencingValues": {
					"type": "IfcAppliedValue",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRegularTimeSeries": {
			"domain": "ifctimeseriesresource",
			"superclasses": ["IfcTimeSeries"],
			"fields": {
				"TimeStep": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TimeStepAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Values": {
					"type": "IfcTimeSeriesValue",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcReinforcementBarProperties": {
			"domain": "ifcprofilepropertyresource",
			"superclasses": [],
			"fields": {
				"TotalCrossSectionArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TotalCrossSectionAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SteelGrade": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BarSurface": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EffectiveDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EffectiveDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NominalBarDiameter": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NominalBarDiameterAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BarCount": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BarCountAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcReinforcementDefinitionProperties": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"DefinitionType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ReinforcementSectionDefinitions": {
					"type": "IfcSectionReinforcementProperties",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcReinforcingBar": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcReinforcingElement"],
			"fields": {
				"NominalDiameter": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NominalDiameterAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CrossSectionArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CrossSectionAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BarLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BarLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BarRole": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BarSurface": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcReinforcingElement": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcBuildingElementComponent"],
			"fields": {
				"SteelGrade": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcReinforcingMesh": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcReinforcingElement"],
			"fields": {
				"MeshLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MeshLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MeshWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MeshWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalBarNominalDiameter": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalBarNominalDiameterAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransverseBarNominalDiameter": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransverseBarNominalDiameterAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalBarCrossSectionArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalBarCrossSectionAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransverseBarCrossSectionArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransverseBarCrossSectionAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalBarSpacing": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalBarSpacingAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransverseBarSpacing": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransverseBarSpacingAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAggregates": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelDecomposes"],
			"fields": {}
		},
		"IfcRelAssigns": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelationship"],
			"fields": {
				"RelatedObjects": {
					"type": "IfcObjectDefinition",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"RelatedObjectsType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssignsTasks": {
			"domain": "ifcprocessextension",
			"superclasses": ["IfcRelAssignsToControl"],
			"fields": {
				"TimeForTask": {
					"type": "IfcScheduleTimeControl",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelAssignsToActor": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssigns"],
			"fields": {
				"RelatingActor": {
					"type": "IfcActor",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"ActingRole": {
					"type": "IfcActorRole",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssignsToControl": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssigns"],
			"fields": {
				"RelatingControl": {
					"type": "IfcControl",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelAssignsToGroup": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssigns"],
			"fields": {
				"RelatingGroup": {
					"type": "IfcGroup",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelAssignsToProcess": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssigns"],
			"fields": {
				"RelatingProcess": {
					"type": "IfcProcess",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"QuantityInProcess": {
					"type": "IfcMeasureWithUnit",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssignsToProduct": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssigns"],
			"fields": {
				"RelatingProduct": {
					"type": "IfcProduct",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelAssignsToProjectOrder": {
			"domain": "ifcsharedmgmtelements",
			"superclasses": ["IfcRelAssignsToControl"],
			"fields": {}
		},
		"IfcRelAssignsToResource": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssigns"],
			"fields": {
				"RelatingResource": {
					"type": "IfcResource",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelAssociates": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelationship"],
			"fields": {
				"RelatedObjects": {
					"type": "IfcRoot",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRelAssociatesAppliedValue": {
			"domain": "ifcsharedmgmtelements",
			"superclasses": ["IfcRelAssociates"],
			"fields": {
				"RelatingAppliedValue": {
					"type": "IfcAppliedValue",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssociatesApproval": {
			"domain": "ifccontrolextension",
			"superclasses": ["IfcRelAssociates"],
			"fields": {
				"RelatingApproval": {
					"type": "IfcApproval",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssociatesClassification": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssociates"],
			"fields": {
				"RelatingClassification": {
					"type": "IfcClassificationNotationSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssociatesConstraint": {
			"domain": "ifccontrolextension",
			"superclasses": ["IfcRelAssociates"],
			"fields": {
				"Intent": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RelatingConstraint": {
					"type": "IfcConstraint",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssociatesDocument": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssociates"],
			"fields": {
				"RelatingDocument": {
					"type": "IfcDocumentSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssociatesLibrary": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelAssociates"],
			"fields": {
				"RelatingLibrary": {
					"type": "IfcLibrarySelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssociatesMaterial": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelAssociates"],
			"fields": {
				"RelatingMaterial": {
					"type": "IfcMaterialSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelAssociatesProfileProperties": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcRelAssociates"],
			"fields": {
				"RelatingProfileProperties": {
					"type": "IfcProfileProperties",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ProfileSectionLocation": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ProfileOrientation": {
					"type": "IfcOrientationSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelConnects": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelationship"],
			"fields": {}
		},
		"IfcRelConnectsElements": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"ConnectionGeometry": {
					"type": "IfcConnectionGeometry",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"RelatingElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelConnectsPathElements": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcRelConnectsElements"],
			"fields": {
				"RelatingPriorities": {
					"type": "long",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"RelatedPriorities": {
					"type": "long",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"RelatedConnectionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RelatingConnectionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelConnectsPortToElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingPort": {
					"type": "IfcPort",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelConnectsPorts": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingPort": {
					"type": "IfcPort",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedPort": {
					"type": "IfcPort",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RealizingElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelConnectsStructuralActivity": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingElement": {
					"type": "IfcStructuralActivityAssignmentSelect",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedStructuralActivity": {
					"type": "IfcStructuralActivity",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelConnectsStructuralElement": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedStructuralMember": {
					"type": "IfcStructuralMember",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelConnectsStructuralMember": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingStructuralMember": {
					"type": "IfcStructuralMember",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedStructuralConnection": {
					"type": "IfcStructuralConnection",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"AppliedCondition": {
					"type": "IfcBoundaryCondition",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"AdditionalConditions": {
					"type": "IfcStructuralConnectionCondition",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SupportedLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SupportedLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ConditionCoordinateSystem": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelConnectsWithEccentricity": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcRelConnectsStructuralMember"],
			"fields": {
				"ConnectionConstraint": {
					"type": "IfcConnectionGeometry",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelConnectsWithRealizingElements": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnectsElements"],
			"fields": {
				"RealizingElements": {
					"type": "IfcElement",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ConnectionType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelContainedInSpatialStructure": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatedElements": {
					"type": "IfcProduct",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"RelatingStructure": {
					"type": "IfcSpatialStructureElement",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelCoversBldgElements": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingBuildingElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedCoverings": {
					"type": "IfcCovering",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRelCoversSpaces": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatedSpace": {
					"type": "IfcSpace",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedCoverings": {
					"type": "IfcCovering",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRelDecomposes": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelationship"],
			"fields": {
				"RelatingObject": {
					"type": "IfcObjectDefinition",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedObjects": {
					"type": "IfcObjectDefinition",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRelDefines": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelationship"],
			"fields": {
				"RelatedObjects": {
					"type": "IfcObject",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRelDefinesByProperties": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelDefines"],
			"fields": {
				"RelatingPropertyDefinition": {
					"type": "IfcPropertySetDefinition",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelDefinesByType": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelDefines"],
			"fields": {
				"RelatingType": {
					"type": "IfcTypeObject",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelFillsElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingOpeningElement": {
					"type": "IfcOpeningElement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedBuildingElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelFlowControlElements": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatedControlElements": {
					"type": "IfcDistributionControlElement",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"RelatingFlowElement": {
					"type": "IfcDistributionFlowElement",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelInteractionRequirements": {
			"domain": "ifcarchitecturedomain",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"DailyInteraction": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DailyInteractionAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ImportanceRating": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ImportanceRatingAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LocationOfInteraction": {
					"type": "IfcSpatialStructureElement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"RelatedSpaceProgram": {
					"type": "IfcSpaceProgram",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatingSpaceProgram": {
					"type": "IfcSpaceProgram",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelNests": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelDecomposes"],
			"fields": {}
		},
		"IfcRelOccupiesSpaces": {
			"domain": "ifcsharedfacilitieselements",
			"superclasses": ["IfcRelAssignsToActor"],
			"fields": {}
		},
		"IfcRelOverridesProperties": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelDefinesByProperties"],
			"fields": {
				"OverridingProperties": {
					"type": "IfcProperty",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcRelProjectsElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedFeatureElement": {
					"type": "IfcFeatureElementAddition",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelReferencedInSpatialStructure": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatedElements": {
					"type": "IfcProduct",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"RelatingStructure": {
					"type": "IfcSpatialStructureElement",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelSchedulesCostItems": {
			"domain": "ifcsharedmgmtelements",
			"superclasses": ["IfcRelAssignsToControl"],
			"fields": {}
		},
		"IfcRelSequence": {
			"domain": "ifckernel",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingProcess": {
					"type": "IfcProcess",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedProcess": {
					"type": "IfcProcess",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"TimeLag": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TimeLagAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SequenceType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelServicesBuildings": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingSystem": {
					"type": "IfcSystem",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedBuildings": {
					"type": "IfcSpatialStructureElement",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRelSpaceBoundary": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingSpace": {
					"type": "IfcSpace",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedBuildingElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"ConnectionGeometry": {
					"type": "IfcConnectionGeometry",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"PhysicalOrVirtualBoundary": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InternalOrExternalBoundary": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRelVoidsElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcRelConnects"],
			"fields": {
				"RelatingBuildingElement": {
					"type": "IfcElement",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RelatedOpeningElement": {
					"type": "IfcFeatureElementSubtraction",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcRelationship": {
			"domain": "ifckernel",
			"superclasses": ["IfcRoot"],
			"fields": {}
		},
		"IfcRelaxation": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": [],
			"fields": {
				"RelaxationValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RelaxationValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InitialStress": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InitialStressAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRepresentation": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcLayeredItem"],
			"fields": {
				"ContextOfItems": {
					"type": "IfcRepresentationContext",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"RepresentationIdentifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RepresentationType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Items": {
					"type": "IfcRepresentationItem",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"RepresentationMap": {
					"type": "IfcRepresentationMap",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"LayerAssignments": {
					"type": "IfcPresentationLayerAssignment",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"OfProductRepresentation": {
					"type": "IfcProductRepresentation",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRepresentationContext": {
			"domain": "ifcrepresentationresource",
			"superclasses": [],
			"fields": {
				"ContextIdentifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ContextType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RepresentationsInContext": {
					"type": "IfcRepresentation",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRepresentationItem": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcLayeredItem"],
			"fields": {
				"LayerAssignments": {
					"type": "IfcPresentationLayerAssignment",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"StyledByItem": {
					"type": "IfcStyledItem",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRepresentationMap": {
			"domain": "ifcgeometryresource",
			"superclasses": [],
			"fields": {
				"MappingOrigin": {
					"type": "IfcAxis2Placement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"MappedRepresentation": {
					"type": "IfcRepresentation",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"MapUsage": {
					"type": "IfcMappedItem",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcResource": {
			"domain": "ifckernel",
			"superclasses": ["IfcObject"],
			"fields": {
				"ResourceOf": {
					"type": "IfcRelAssignsToResource",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcRevolvedAreaSolid": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcSweptAreaSolid"],
			"fields": {
				"Axis": {
					"type": "IfcAxis1Placement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Angle": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AngleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRibPlateProfileProperties": {
			"domain": "ifcprofilepropertyresource",
			"superclasses": ["IfcProfileProperties"],
			"fields": {
				"Thickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RibHeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RibHeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RibWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RibWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RibSpacing": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RibSpacingAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Direction": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRightCircularCone": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcCsgPrimitive3D"],
			"fields": {
				"Height": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BottomRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BottomRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRightCircularCylinder": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcCsgPrimitive3D"],
			"fields": {
				"Height": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRoof": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"ShapeType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRoot": {
			"domain": "ifckernel",
			"superclasses": [],
			"fields": {
				"GlobalId": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OwnerHistory": {
					"type": "IfcOwnerHistory",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRoundedEdgeFeature": {
			"domain": "ifcsharedcomponentelements",
			"superclasses": ["IfcEdgeFeature"],
			"fields": {
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRoundedRectangleProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcRectangleProfileDef"],
			"fields": {
				"RoundingRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RoundingRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSIUnit": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcNamedUnit"],
			"fields": {
				"Prefix": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Name": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSanitaryTerminalType": {
			"domain": "ifcplumbingfireprotectiondomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcScheduleTimeControl": {
			"domain": "ifcprocessextension",
			"superclasses": ["IfcControl"],
			"fields": {
				"ActualStart": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"EarlyStart": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LateStart": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ScheduleStart": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ActualFinish": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"EarlyFinish": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LateFinish": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ScheduleFinish": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ScheduleDuration": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ScheduleDurationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ActualDuration": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ActualDurationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RemainingTime": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RemainingTimeAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FreeFloat": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FreeFloatAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TotalFloat": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TotalFloatAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IsCritical": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StatusTime": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"StartFloat": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StartFloatAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FinishFloat": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FinishFloatAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Completion": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompletionAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ScheduleTimeControlAssigned": {
					"type": "IfcRelAssignsTasks",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcSectionProperties": {
			"domain": "ifcprofilepropertyresource",
			"superclasses": [],
			"fields": {
				"SectionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StartProfile": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"EndProfile": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSectionReinforcementProperties": {
			"domain": "ifcprofilepropertyresource",
			"superclasses": [],
			"fields": {
				"LongitudinalStartPosition": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalStartPositionAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalEndPosition": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LongitudinalEndPositionAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransversePosition": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransversePositionAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ReinforcementRole": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SectionDefinition": {
					"type": "IfcSectionProperties",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CrossSectionReinforcementDefinitions": {
					"type": "IfcReinforcementBarProperties",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcSectionedSpine": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"SpineCurve": {
					"type": "IfcCompositeCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"CrossSections": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"CrossSectionPositions": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSensorType": {
			"domain": "ifcbuildingcontrolsdomain",
			"superclasses": ["IfcDistributionControlElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcServiceLife": {
			"domain": "ifcsharedfacilitieselements",
			"superclasses": ["IfcControl"],
			"fields": {
				"ServiceLifeType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ServiceLifeDuration": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ServiceLifeDurationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcServiceLifeFactor": {
			"domain": "ifcsharedfacilitieselements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UpperValue": {
					"type": "IfcMeasureValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"MostUsedValue": {
					"type": "IfcMeasureValue",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LowerValue": {
					"type": "IfcMeasureValue",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcShapeAspect": {
			"domain": "ifcrepresentationresource",
			"superclasses": [],
			"fields": {
				"ShapeRepresentations": {
					"type": "IfcShapeModel",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ProductDefinitional": {
					"type": "boolean",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PartOfProductDefinitionShape": {
					"type": "IfcProductDefinitionShape",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcShapeModel": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcRepresentation"],
			"fields": {
				"OfShapeAspect": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcShapeRepresentation": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcShapeModel"],
			"fields": {}
		},
		"IfcShellBasedSurfaceModel": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"SbsmBoundary": {
					"type": "IfcShell",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSimpleProperty": {
			"domain": "ifcpropertyresource",
			"superclasses": ["IfcProperty"],
			"fields": {}
		},
		"IfcSite": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcSpatialStructureElement"],
			"fields": {
				"RefLatitude": {
					"type": "long",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"RefLongitude": {
					"type": "long",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"RefElevation": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RefElevationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LandTitleNumber": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SiteAddress": {
					"type": "IfcPostalAddress",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSlab": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSlabType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSlippageConnectionCondition": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralConnectionCondition"],
			"fields": {
				"SlippageX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SlippageXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SlippageY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SlippageYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SlippageZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SlippageZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSolidModel": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcBooleanOperand"],
			"fields": {
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSoundProperties": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"IsAttenuating": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SoundScale": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SoundValues": {
					"type": "IfcSoundValue",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcSoundValue": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"SoundLevelTimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Frequency": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrequencyAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SoundLevelSingleValue": {
					"type": "IfcDerivedMeasureValue",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSpace": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcSpatialStructureElement"],
			"fields": {
				"InteriorOrExteriorSpace": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ElevationWithFlooring": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ElevationWithFlooringAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HasCoverings": {
					"type": "IfcRelCoversSpaces",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"BoundedBy": {
					"type": "IfcRelSpaceBoundary",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcSpaceHeaterType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSpaceProgram": {
			"domain": "ifcarchitecturedomain",
			"superclasses": ["IfcControl"],
			"fields": {
				"SpaceProgramIdentifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaxRequiredArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaxRequiredAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinRequiredArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinRequiredAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RequestedLocation": {
					"type": "IfcSpatialStructureElement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"StandardRequiredArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StandardRequiredAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HasInteractionReqsFrom": {
					"type": "IfcRelInteractionRequirements",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasInteractionReqsTo": {
					"type": "IfcRelInteractionRequirements",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcSpaceThermalLoadProperties": {
			"domain": "ifcsharedbldgserviceelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"ApplicableValueRatio": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ApplicableValueRatioAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalLoadSource": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PropertySource": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SourceDescription": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalLoadTimeSeriesValues": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"UserDefinedThermalLoadSource": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedPropertySource": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalLoadType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSpaceType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcSpatialStructureElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSpatialStructureElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcProduct"],
			"fields": {
				"LongName": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CompositionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ReferencesElements": {
					"type": "IfcRelReferencedInSpatialStructure",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ServicedBySystems": {
					"type": "IfcRelServicesBuildings",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ContainsElements": {
					"type": "IfcRelContainedInSpatialStructure",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcSpatialStructureElementType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElementType"],
			"fields": {}
		},
		"IfcSphere": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcCsgPrimitive3D"],
			"fields": {
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStackTerminalType": {
			"domain": "ifcplumbingfireprotectiondomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStair": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"ShapeType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStairFlight": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"NumberOfRiser": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NumberOfTreads": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RiserHeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RiserHeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TreadLength": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TreadLengthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStairFlightType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralAction": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralActivity"],
			"fields": {
				"DestabilizingLoad": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CausedBy": {
					"type": "IfcStructuralReaction",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcStructuralActivity": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcProduct"],
			"fields": {
				"AppliedLoad": {
					"type": "IfcStructuralLoad",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"GlobalOrLocal": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AssignedToStructuralItem": {
					"type": "IfcRelConnectsStructuralActivity",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcStructuralAnalysisModel": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcSystem"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OrientationOf2DPlane": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"LoadedBy": {
					"type": "IfcStructuralLoadGroup",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"HasResults": {
					"type": "IfcStructuralResultGroup",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcStructuralConnection": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralItem"],
			"fields": {
				"AppliedCondition": {
					"type": "IfcBoundaryCondition",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ConnectsStructuralMembers": {
					"type": "IfcRelConnectsStructuralMember",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcStructuralConnectionCondition": {
			"domain": "ifcstructuralloadresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralCurveConnection": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralConnection"],
			"fields": {}
		},
		"IfcStructuralCurveMember": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralMember"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralCurveMemberVarying": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralCurveMember"],
			"fields": {}
		},
		"IfcStructuralItem": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcProduct", "IfcStructuralActivityAssignmentSelect"],
			"fields": {
				"AssignedStructuralActivity": {
					"type": "IfcRelConnectsStructuralActivity",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcStructuralLinearAction": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralAction"],
			"fields": {
				"ProjectedOrTrue": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralLinearActionVarying": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralLinearAction"],
			"fields": {
				"VaryingAppliedLoadLocation": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SubsequentAppliedLoads": {
					"type": "IfcStructuralLoad",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcStructuralLoad": {
			"domain": "ifcstructuralloadresource",
			"superclasses": [],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralLoadGroup": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcGroup"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ActionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ActionSource": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Coefficient": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CoefficientAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Purpose": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SourceOfResultGroup": {
					"type": "IfcStructuralResultGroup",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"LoadGroupFor": {
					"type": "IfcStructuralAnalysisModel",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcStructuralLoadLinearForce": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralLoadStatic"],
			"fields": {
				"LinearForceX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearForceXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearForceY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearForceYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearForceZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearForceZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearMomentX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearMomentXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearMomentY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearMomentYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearMomentZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LinearMomentZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralLoadPlanarForce": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralLoadStatic"],
			"fields": {
				"PlanarForceX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlanarForceXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlanarForceY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlanarForceYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlanarForceZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlanarForceZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralLoadSingleDisplacement": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralLoadStatic"],
			"fields": {
				"DisplacementX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DisplacementXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DisplacementY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DisplacementYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DisplacementZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DisplacementZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalDisplacementRX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalDisplacementRXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalDisplacementRY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalDisplacementRYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalDisplacementRZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RotationalDisplacementRZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralLoadSingleDisplacementDistortion": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralLoadSingleDisplacement"],
			"fields": {
				"Distortion": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DistortionAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralLoadSingleForce": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralLoadStatic"],
			"fields": {
				"ForceX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ForceXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ForceY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ForceYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ForceZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ForceZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralLoadSingleForceWarping": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralLoadSingleForce"],
			"fields": {
				"WarpingMoment": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WarpingMomentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralLoadStatic": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralLoad"],
			"fields": {}
		},
		"IfcStructuralLoadTemperature": {
			"domain": "ifcstructuralloadresource",
			"superclasses": ["IfcStructuralLoadStatic"],
			"fields": {
				"DeltaT_Constant": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DeltaT_ConstantAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DeltaT_Y": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DeltaT_YAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DeltaT_Z": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DeltaT_ZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralMember": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralItem"],
			"fields": {
				"ReferencesElement": {
					"type": "IfcRelConnectsStructuralElement",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ConnectedBy": {
					"type": "IfcRelConnectsStructuralMember",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcStructuralPlanarAction": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralAction"],
			"fields": {
				"ProjectedOrTrue": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralPlanarActionVarying": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralPlanarAction"],
			"fields": {
				"VaryingAppliedLoadLocation": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SubsequentAppliedLoads": {
					"type": "IfcStructuralLoad",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcStructuralPointAction": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralAction"],
			"fields": {}
		},
		"IfcStructuralPointConnection": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralConnection"],
			"fields": {}
		},
		"IfcStructuralPointReaction": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralReaction"],
			"fields": {}
		},
		"IfcStructuralProfileProperties": {
			"domain": "ifcprofilepropertyresource",
			"superclasses": ["IfcGeneralProfileProperties"],
			"fields": {
				"TorsionalConstantX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TorsionalConstantXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentOfInertiaYZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentOfInertiaYZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentOfInertiaY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentOfInertiaYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentOfInertiaZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MomentOfInertiaZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WarpingConstant": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WarpingConstantAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearCentreZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearCentreZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearCentreY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearCentreYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearDeformationAreaZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearDeformationAreaZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearDeformationAreaY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearDeformationAreaYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumSectionModulusY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumSectionModulusYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumSectionModulusY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumSectionModulusYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumSectionModulusZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MaximumSectionModulusZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumSectionModulusZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinimumSectionModulusZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TorsionalSectionModulus": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TorsionalSectionModulusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralReaction": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralActivity"],
			"fields": {
				"Causes": {
					"type": "IfcStructuralAction",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcStructuralResultGroup": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcGroup"],
			"fields": {
				"TheoryType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ResultForLoadGroup": {
					"type": "IfcStructuralLoadGroup",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"IsLinear": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ResultGroupFor": {
					"type": "IfcStructuralAnalysisModel",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcStructuralSteelProfileProperties": {
			"domain": "ifcprofilepropertyresource",
			"superclasses": ["IfcStructuralProfileProperties"],
			"fields": {
				"ShearAreaZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearAreaZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearAreaY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShearAreaYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlasticShapeFactorY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlasticShapeFactorYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlasticShapeFactorZ": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PlasticShapeFactorZAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralSurfaceConnection": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralConnection"],
			"fields": {}
		},
		"IfcStructuralSurfaceMember": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralMember"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Thickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuralSurfaceMemberVarying": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": ["IfcStructuralSurfaceMember"],
			"fields": {
				"SubsequentThickness": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"SubsequentThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"VaryingThicknessLocation": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"VaryingThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"VaryingThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStructuredDimensionCallout": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcDraughtingCallout"],
			"fields": {}
		},
		"IfcStyleModel": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcRepresentation"],
			"fields": {}
		},
		"IfcStyledItem": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcRepresentationItem"],
			"fields": {
				"Item": {
					"type": "IfcRepresentationItem",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"Styles": {
					"type": "IfcPresentationStyleAssignment",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcStyledRepresentation": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcStyleModel"],
			"fields": {}
		},
		"IfcSubContractResource": {
			"domain": "ifcconstructionmgmtdomain",
			"superclasses": ["IfcConstructionResource"],
			"fields": {
				"SubContractor": {
					"type": "IfcActorSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"JobDescription": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSubedge": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcEdge"],
			"fields": {
				"ParentEdge": {
					"type": "IfcEdge",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSurface": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcGeometricSetSelect", "IfcSurfaceOrFaceSurface"],
			"fields": {}
		},
		"IfcSurfaceCurveSweptAreaSolid": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcSweptAreaSolid"],
			"fields": {
				"Directrix": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"StartParam": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StartParamAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EndParam": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EndParamAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ReferenceSurface": {
					"type": "IfcSurface",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSurfaceOfLinearExtrusion": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcSweptSurface"],
			"fields": {
				"ExtrudedDirection": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Depth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSurfaceOfRevolution": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcSweptSurface"],
			"fields": {
				"AxisPosition": {
					"type": "IfcAxis1Placement",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSurfaceStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcPresentationStyle", "IfcPresentationStyleSelect"],
			"fields": {
				"Side": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Styles": {
					"type": "IfcSurfaceStyleElementSelect",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcSurfaceStyleLighting": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSurfaceStyleElementSelect"],
			"fields": {
				"DiffuseTransmissionColour": {
					"type": "IfcColourRgb",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"DiffuseReflectionColour": {
					"type": "IfcColourRgb",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TransmissionColour": {
					"type": "IfcColourRgb",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ReflectanceColour": {
					"type": "IfcColourRgb",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSurfaceStyleRefraction": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSurfaceStyleElementSelect"],
			"fields": {
				"RefractionIndex": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RefractionIndexAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DispersionFactor": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DispersionFactorAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSurfaceStyleRendering": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSurfaceStyleShading"],
			"fields": {
				"Transparency": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransparencyAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DiffuseColour": {
					"type": "IfcColourOrFactor",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TransmissionColour": {
					"type": "IfcColourOrFactor",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"DiffuseTransmissionColour": {
					"type": "IfcColourOrFactor",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ReflectionColour": {
					"type": "IfcColourOrFactor",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SpecularColour": {
					"type": "IfcColourOrFactor",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"SpecularHighlight": {
					"type": "IfcSpecularHighlightSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"ReflectanceMethod": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSurfaceStyleShading": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSurfaceStyleElementSelect"],
			"fields": {
				"SurfaceColour": {
					"type": "IfcColourRgb",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSurfaceStyleWithTextures": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSurfaceStyleElementSelect"],
			"fields": {
				"Textures": {
					"type": "IfcSurfaceTexture",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcSurfaceTexture": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {
				"RepeatS": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RepeatT": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TextureType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TextureTransform": {
					"type": "IfcCartesianTransformationOperator2D",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSweptAreaSolid": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcSolidModel"],
			"fields": {
				"SweptArea": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Position": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSweptDiskSolid": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": ["IfcSolidModel"],
			"fields": {
				"Directrix": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Radius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"RadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InnerRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"InnerRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StartParam": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StartParamAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EndParam": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EndParamAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSweptSurface": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcSurface"],
			"fields": {
				"SweptCurve": {
					"type": "IfcProfileDef",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Position": {
					"type": "IfcAxis2Placement3D",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSwitchingDeviceType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcFlowControllerType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSymbolStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcPresentationStyle", "IfcPresentationStyleSelect"],
			"fields": {
				"StyleOfSymbol": {
					"type": "IfcSymbolStyleSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSystem": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcGroup"],
			"fields": {
				"ServicesBuildings": {
					"type": "IfcRelServicesBuildings",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcSystemFurnitureElementType": {
			"domain": "ifcsharedfacilitieselements",
			"superclasses": ["IfcFurnishingElementType"],
			"fields": {}
		},
		"IfcTShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"Depth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeEdgeRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeEdgeRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebEdgeRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebEdgeRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebSlope": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebSlopeAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeSlope": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeSlopeAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInY": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInYAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTable": {
			"domain": "ifcutilityresource",
			"superclasses": ["IfcMetricValueSelect"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Rows": {
					"type": "IfcTableRow",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcTableRow": {
			"domain": "ifcutilityresource",
			"superclasses": [],
			"fields": {
				"RowCells": {
					"type": "IfcValue",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"IsHeading": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OfTable": {
					"type": "IfcTable",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcTankType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowStorageDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTask": {
			"domain": "ifcprocessextension",
			"superclasses": ["IfcProcess"],
			"fields": {
				"TaskId": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Status": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WorkMethod": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"IsMilestone": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Priority": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTelecomAddress": {
			"domain": "ifcactorresource",
			"superclasses": ["IfcAddress"],
			"fields": {
				"TelephoneNumbers": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"FacsimileNumbers": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"PagerNumber": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ElectronicMailAddresses": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"WWWHomePageURL": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTendon": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcReinforcingElement"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NominalDiameter": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"NominalDiameterAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CrossSectionArea": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CrossSectionAreaAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TensionForce": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TensionForceAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PreStress": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PreStressAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrictionCoefficient": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrictionCoefficientAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AnchorageSlip": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AnchorageSlipAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinCurvatureRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MinCurvatureRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTendonAnchor": {
			"domain": "ifcstructuralelementsdomain",
			"superclasses": ["IfcReinforcingElement"],
			"fields": {}
		},
		"IfcTerminatorSymbol": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": ["IfcAnnotationSymbolOccurrence"],
			"fields": {
				"AnnotatedCurve": {
					"type": "IfcAnnotationCurveOccurrence",
					"reference": true,
					"many": false,
					"inverse": true
				}
			}
		},
		"IfcTextLiteral": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcGeometricRepresentationItem"],
			"fields": {
				"Literal": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Placement": {
					"type": "IfcAxis2Placement",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Path": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextLiteralWithExtent": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcTextLiteral"],
			"fields": {
				"Extent": {
					"type": "IfcPlanarExtent",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"BoxAlignment": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcPresentationStyle", "IfcPresentationStyleSelect"],
			"fields": {
				"TextCharacterAppearance": {
					"type": "IfcCharacterStyleSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TextStyle": {
					"type": "IfcTextStyleSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TextFontStyle": {
					"type": "IfcTextFontSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextStyleFontModel": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcPreDefinedTextFont"],
			"fields": {
				"FontFamily": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"FontStyle": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FontVariant": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FontWeight": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FontSize": {
					"type": "IfcSizeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextStyleForDefinedFont": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcCharacterStyleSelect"],
			"fields": {
				"Colour": {
					"type": "IfcColour",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"BackgroundColour": {
					"type": "IfcColour",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextStyleTextModel": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcTextStyleSelect"],
			"fields": {
				"TextIndent": {
					"type": "IfcSizeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TextAlign": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TextDecoration": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LetterSpacing": {
					"type": "IfcSizeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"WordSpacing": {
					"type": "IfcSizeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TextTransform": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LineHeight": {
					"type": "IfcSizeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextStyleWithBoxCharacteristics": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcTextStyleSelect"],
			"fields": {
				"BoxHeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoxHeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoxWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoxWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoxSlantAngle": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoxSlantAngleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoxRotateAngle": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoxRotateAngleAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CharacterSpacing": {
					"type": "IfcSizeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextureCoordinate": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": [],
			"fields": {
				"AnnotatedSurface": {
					"type": "IfcAnnotationSurface",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcTextureCoordinateGenerator": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcTextureCoordinate"],
			"fields": {
				"Mode": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Parameter": {
					"type": "IfcSimpleValue",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcTextureMap": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcTextureCoordinate"],
			"fields": {
				"TextureMaps": {
					"type": "IfcVertexBasedTextureMap",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcTextureVertex": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": [],
			"fields": {
				"Coordinates": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"CoordinatesAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcThermalMaterialProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"SpecificHeatCapacity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SpecificHeatCapacityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoilingPoint": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BoilingPointAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FreezingPoint": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FreezingPointAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalConductivity": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ThermalConductivityAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTimeSeries": {
			"domain": "ifctimeseriesresource",
			"superclasses": ["IfcMetricValueSelect", "IfcObjectReferenceSelect"],
			"fields": {
				"Name": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Description": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StartTime": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"EndTime": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"TimeSeriesDataType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DataOrigin": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedDataOrigin": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Unit": {
					"type": "IfcUnit",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"DocumentedBy": {
					"type": "IfcTimeSeriesReferenceRelationship",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcTimeSeriesReferenceRelationship": {
			"domain": "ifctimeseriesresource",
			"superclasses": [],
			"fields": {
				"ReferencedTimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": true
				},
				"TimeSeriesReferences": {
					"type": "IfcDocumentSelect",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcTimeSeriesSchedule": {
			"domain": "ifccontrolextension",
			"superclasses": ["IfcControl"],
			"fields": {
				"ApplicableDates": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"TimeSeriesScheduleType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TimeSeries": {
					"type": "IfcTimeSeries",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTimeSeriesValue": {
			"domain": "ifctimeseriesresource",
			"superclasses": [],
			"fields": {
				"ListValues": {
					"type": "IfcValue",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcTopologicalRepresentationItem": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcRepresentationItem"],
			"fields": {}
		},
		"IfcTopologyRepresentation": {
			"domain": "ifcrepresentationresource",
			"superclasses": ["IfcShapeModel"],
			"fields": {}
		},
		"IfcTransformerType": {
			"domain": "ifcelectricaldomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTransportElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {
				"OperationType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CapacityByWeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CapacityByWeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CapacityByNumber": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CapacityByNumberAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTransportElementType": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTrapeziumProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"BottomXDim": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"BottomXDimAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopXDim": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopXDimAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YDim": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"YDimAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopXOffset": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TopXOffsetAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTrimmedCurve": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcBoundedCurve"],
			"fields": {
				"BasisCurve": {
					"type": "IfcCurve",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Trim1": {
					"type": "IfcTrimmingSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Trim2": {
					"type": "IfcTrimmingSelect",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"SenseAgreement": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MasterRepresentation": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTubeBundleType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTwoDirectionRepeatFactor": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcOneDirectionRepeatFactor"],
			"fields": {
				"SecondRepeatFactor": {
					"type": "IfcVector",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTypeObject": {
			"domain": "ifckernel",
			"superclasses": ["IfcObjectDefinition"],
			"fields": {
				"ApplicableOccurrence": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HasPropertySets": {
					"type": "IfcPropertySetDefinition",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"ObjectTypeOf": {
					"type": "IfcRelDefinesByType",
					"reference": true,
					"many": true,
					"inverse": true
				}
			}
		},
		"IfcTypeProduct": {
			"domain": "ifckernel",
			"superclasses": ["IfcTypeObject"],
			"fields": {
				"RepresentationMaps": {
					"type": "IfcRepresentationMap",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Tag": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcUShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"Depth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EdgeRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EdgeRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeSlope": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeSlopeAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInX": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CentreOfGravityInXAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcUnitAssignment": {
			"domain": "ifcmeasureresource",
			"superclasses": [],
			"fields": {
				"Units": {
					"type": "IfcUnit",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcUnitaryEquipmentType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcEnergyConversionDeviceType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcValveType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcFlowControllerType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcVector": {
			"domain": "ifcgeometryresource",
			"superclasses": ["IfcGeometricRepresentationItem", "IfcVectorOrDirection"],
			"fields": {
				"Orientation": {
					"type": "IfcDirection",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Magnitude": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MagnitudeAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Dim": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcVertex": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcTopologicalRepresentationItem"],
			"fields": {}
		},
		"IfcVertexBasedTextureMap": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": [],
			"fields": {
				"TextureVertices": {
					"type": "IfcTextureVertex",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"TexturePoints": {
					"type": "IfcCartesianPoint",
					"reference": true,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcVertexLoop": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcLoop"],
			"fields": {
				"LoopVertex": {
					"type": "IfcVertex",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcVertexPoint": {
			"domain": "ifctopologyresource",
			"superclasses": ["IfcVertex", "IfcPointOrVertexPoint"],
			"fields": {
				"VertexGeometry": {
					"type": "IfcPoint",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcVibrationIsolatorType": {
			"domain": "ifchvacdomain",
			"superclasses": ["IfcDiscreteAccessoryType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcVirtualElement": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcElement"],
			"fields": {}
		},
		"IfcVirtualGridIntersection": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": [],
			"fields": {
				"IntersectingAxes": {
					"type": "IfcGridAxis",
					"reference": true,
					"many": true,
					"inverse": true
				},
				"OffsetDistances": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"OffsetDistancesAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcWall": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {}
		},
		"IfcWallStandardCase": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcWall"],
			"fields": {}
		},
		"IfcWallType": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElementType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWasteTerminalType": {
			"domain": "ifcplumbingfireprotectiondomain",
			"superclasses": ["IfcFlowTerminalType"],
			"fields": {
				"PredefinedType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWaterProperties": {
			"domain": "ifcmaterialpropertyresource",
			"superclasses": ["IfcMaterialProperties"],
			"fields": {
				"IsPotable": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Hardness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"HardnessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AlkalinityConcentration": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AlkalinityConcentrationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AcidityConcentration": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"AcidityConcentrationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ImpuritiesContent": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ImpuritiesContentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PHLevel": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PHLevelAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DissolvedSolidsContent": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DissolvedSolidsContentAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWindow": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcBuildingElement"],
			"fields": {
				"OverallHeight": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallHeightAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OverallWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWindowLiningProperties": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"LiningDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LiningDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LiningThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"LiningThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransomThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TransomThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MullionThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"MullionThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FirstTransomOffset": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FirstTransomOffsetAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SecondTransomOffset": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SecondTransomOffsetAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FirstMullionOffset": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FirstMullionOffsetAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SecondMullionOffset": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"SecondMullionOffsetAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShapeAspectStyle": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWindowPanelProperties": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcPropertySetDefinition"],
			"fields": {
				"OperationType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"PanelPosition": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrameDepth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrameDepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrameThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FrameThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ShapeAspectStyle": {
					"type": "IfcShapeAspect",
					"reference": true,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWindowStyle": {
			"domain": "ifcsharedbldgelements",
			"superclasses": ["IfcTypeProduct"],
			"fields": {
				"ConstructionType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"OperationType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"ParameterTakesPrecedence": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Sizeable": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWorkControl": {
			"domain": "ifcprocessextension",
			"superclasses": ["IfcControl"],
			"fields": {
				"Identifier": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"CreationDate": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"Creators": {
					"type": "IfcPerson",
					"reference": true,
					"many": true,
					"inverse": false
				},
				"Purpose": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"Duration": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DurationAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TotalFloat": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"TotalFloatAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"StartTime": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"FinishTime": {
					"type": "IfcDateTimeSelect",
					"reference": true,
					"many": false,
					"inverse": false
				},
				"WorkControlType": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"UserDefinedControlType": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWorkPlan": {
			"domain": "ifcprocessextension",
			"superclasses": ["IfcWorkControl"],
			"fields": {}
		},
		"IfcWorkSchedule": {
			"domain": "ifcprocessextension",
			"superclasses": ["IfcWorkControl"],
			"fields": {}
		},
		"IfcZShapeProfileDef": {
			"domain": "ifcprofileresource",
			"superclasses": ["IfcParameterizedProfileDef"],
			"fields": {
				"Depth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"DepthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeWidth": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeWidthAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"WebThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeThickness": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FlangeThicknessAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"FilletRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EdgeRadius": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"EdgeRadiusAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcZone": {
			"domain": "ifcproductextension",
			"superclasses": ["IfcGroup"],
			"fields": {}
		},
		"IfcAbsorbedDoseMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAccelerationMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAmountOfSubstanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAngularVelocityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcAreaMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoolean": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcSimpleValue", "IfcValue"],
			"fields": {
				"wrappedValue": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcContextDependentMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCountMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcCurvatureMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDayInMonthNumber": {
			"domain": "ifcdatetimeresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDaylightSavingHour": {
			"domain": "ifcdatetimeresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDescriptiveMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue", "IfcSizeSelect"],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDimensionCount": {
			"domain": "ifcgeometryresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDoseEquivalentMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcDynamicViscosityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricCapacitanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricChargeMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricConductanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricCurrentMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricResistanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcElectricVoltageMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcEnergyMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFontStyle": {
			"domain": "ifcpresentationresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFontVariant": {
			"domain": "ifcpresentationresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFontWeight": {
			"domain": "ifcpresentationresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcForceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcFrequencyMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcGloballyUniqueId": {
			"domain": "ifcutilityresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcHeatFluxDensityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcHeatingValueMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcHourInDay": {
			"domain": "ifcdatetimeresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcIdentifier": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcSimpleValue"],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcIlluminanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcInductanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcInteger": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcSimpleValue"],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcIntegerCountRateMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcIonConcentrationMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcIsothermalMoistureCapacityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcKinematicViscosityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLabel": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcConditionCriterionSelect", "IfcSimpleValue"],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLengthMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue", "IfcSizeSelect"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLinearForceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLinearMomentMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLinearStiffnessMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLinearVelocityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLogical": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcSimpleValue"],
			"fields": {
				"wrappedValue": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLuminousFluxMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLuminousIntensityDistributionMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcLuminousIntensityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMagneticFluxDensityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMagneticFluxMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMassDensityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMassFlowRateMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMassMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMassPerLengthMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMinuteInHour": {
			"domain": "ifcdatetimeresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcModulusOfElasticityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcModulusOfLinearSubgradeReactionMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcModulusOfRotationalSubgradeReactionMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcModulusOfSubgradeReactionMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMoistureDiffusivityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMolecularWeightMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMomentOfInertiaMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMonetaryMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcAppliedValueSelect", "IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcMonthInYearNumber": {
			"domain": "ifcdatetimeresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcNumericMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPHMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcParameterValue": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue", "IfcTrimmingSelect"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPlanarForceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPlaneAngleMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue", "IfcOrientationSelect"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPowerMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPresentableText": {
			"domain": "ifcpresentationresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcPressureMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRadioActivityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRatioMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcAppliedValueSelect", "IfcMeasureValue", "IfcSizeSelect"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcReal": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcSimpleValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRotationalFrequencyMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRotationalMassMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcRotationalStiffnessMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSecondInMinute": {
			"domain": "ifcdatetimeresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSectionModulusMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSectionalAreaIntegralMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcShearModulusMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSolidAngleMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSoundPowerMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSoundPressureMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSpecificHeatCapacityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSpecularExponent": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSpecularHighlightSelect"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcSpecularRoughness": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcSpecularHighlightSelect"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTemperatureGradientMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcText": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMetricValueSelect", "IfcSimpleValue"],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextAlignment": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextDecoration": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextFontName": {
			"domain": "ifcpresentationresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTextTransformation": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcThermalAdmittanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcThermalConductivityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcThermalExpansionCoefficientMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcThermalResistanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcThermalTransmittanceMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcThermodynamicTemperatureMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTimeMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTimeStamp": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcTorqueMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcVaporPermeabilityMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcVolumeMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcVolumetricFlowRateMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWarpingConstantMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcWarpingMomentMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": false,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcYearNumber": {
			"domain": "ifcdatetimeresource",
			"superclasses": [],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcBoxAlignment": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": ["IfcLabel"],
			"fields": {}
		},
		"IfcCompoundPlaneAngleMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcDerivedMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "long",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcNormalisedRatioMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcRatioMeasure", "IfcColourOrFactor", "IfcMeasureValue", "IfcSizeSelect"],
			"fields": {}
		},
		"IfcPositiveLengthMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcLengthMeasure", "IfcHatchLineDistanceSelect", "IfcMeasureValue", "IfcSizeSelect"],
			"fields": {}
		},
		"IfcPositivePlaneAngleMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcPlaneAngleMeasure", "IfcMeasureValue"],
			"fields": {}
		},
		"IfcPositiveRatioMeasure": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcRatioMeasure", "IfcMeasureValue", "IfcSizeSelect"],
			"fields": {}
		},
		"IfcActionSourceTypeEnum": {},
		"IfcActionTypeEnum": {},
		"IfcActuatorTypeEnum": {},
		"IfcAddressTypeEnum": {},
		"IfcAheadOrBehind": {},
		"IfcAirTerminalBoxTypeEnum": {},
		"IfcAirTerminalTypeEnum": {},
		"IfcAirToAirHeatRecoveryTypeEnum": {},
		"IfcAlarmTypeEnum": {},
		"IfcAnalysisModelTypeEnum": {},
		"IfcAnalysisTheoryTypeEnum": {},
		"IfcArithmeticOperatorEnum": {},
		"IfcAssemblyPlaceEnum": {},
		"IfcBSplineCurveForm": {},
		"IfcBeamTypeEnum": {},
		"IfcBenchmarkEnum": {},
		"IfcBoilerTypeEnum": {},
		"IfcBooleanOperator": {},
		"IfcBuildingElementProxyTypeEnum": {},
		"IfcCableCarrierFittingTypeEnum": {},
		"IfcCableCarrierSegmentTypeEnum": {},
		"IfcCableSegmentTypeEnum": {},
		"IfcChangeActionEnum": {},
		"IfcChillerTypeEnum": {},
		"IfcCoilTypeEnum": {},
		"IfcColumnTypeEnum": {},
		"IfcCompressorTypeEnum": {},
		"IfcCondenserTypeEnum": {},
		"IfcConnectionTypeEnum": {},
		"IfcConstraintEnum": {},
		"IfcControllerTypeEnum": {},
		"IfcCooledBeamTypeEnum": {},
		"IfcCoolingTowerTypeEnum": {},
		"IfcCostScheduleTypeEnum": {},
		"IfcCoveringTypeEnum": {},
		"IfcCurrencyEnum": {},
		"IfcCurtainWallTypeEnum": {},
		"IfcDamperTypeEnum": {},
		"IfcDataOriginEnum": {},
		"IfcDerivedUnitEnum": {},
		"IfcDimensionExtentUsage": {},
		"IfcDirectionSenseEnum": {},
		"IfcDistributionChamberElementTypeEnum": {},
		"IfcDocumentConfidentialityEnum": {},
		"IfcDocumentStatusEnum": {},
		"IfcDoorPanelOperationEnum": {},
		"IfcDoorPanelPositionEnum": {},
		"IfcDoorStyleConstructionEnum": {},
		"IfcDoorStyleOperationEnum": {},
		"IfcDuctFittingTypeEnum": {},
		"IfcDuctSegmentTypeEnum": {},
		"IfcDuctSilencerTypeEnum": {},
		"IfcElectricApplianceTypeEnum": {},
		"IfcElectricCurrentEnum": {},
		"IfcElectricDistributionPointFunctionEnum": {},
		"IfcElectricFlowStorageDeviceTypeEnum": {},
		"IfcElectricGeneratorTypeEnum": {},
		"IfcElectricHeaterTypeEnum": {},
		"IfcElectricMotorTypeEnum": {},
		"IfcElectricTimeControlTypeEnum": {},
		"IfcElementAssemblyTypeEnum": {},
		"IfcElementCompositionEnum": {},
		"IfcEnergySequenceEnum": {},
		"IfcEnvironmentalImpactCategoryEnum": {},
		"IfcEvaporativeCoolerTypeEnum": {},
		"IfcEvaporatorTypeEnum": {},
		"IfcFanTypeEnum": {},
		"IfcFilterTypeEnum": {},
		"IfcFireSuppressionTerminalTypeEnum": {},
		"IfcFlowDirectionEnum": {},
		"IfcFlowInstrumentTypeEnum": {},
		"IfcFlowMeterTypeEnum": {},
		"IfcFootingTypeEnum": {},
		"IfcGasTerminalTypeEnum": {},
		"IfcGeometricProjectionEnum": {},
		"IfcGlobalOrLocalEnum": {},
		"IfcHeatExchangerTypeEnum": {},
		"IfcHumidifierTypeEnum": {},
		"IfcInternalOrExternalEnum": {},
		"IfcInventoryTypeEnum": {},
		"IfcJunctionBoxTypeEnum": {},
		"IfcLampTypeEnum": {},
		"IfcLayerSetDirectionEnum": {},
		"IfcLightDistributionCurveEnum": {},
		"IfcLightEmissionSourceEnum": {},
		"IfcLightFixtureTypeEnum": {},
		"IfcLoadGroupTypeEnum": {},
		"IfcLogicalOperatorEnum": {},
		"IfcMemberTypeEnum": {},
		"IfcMotorConnectionTypeEnum": {},
		"IfcNullStyleEnum": {},
		"IfcObjectTypeEnum": {},
		"IfcObjectiveEnum": {},
		"IfcOccupantTypeEnum": {},
		"IfcOutletTypeEnum": {},
		"IfcPermeableCoveringOperationEnum": {},
		"IfcPhysicalOrVirtualEnum": {},
		"IfcPileConstructionEnum": {},
		"IfcPileTypeEnum": {},
		"IfcPipeFittingTypeEnum": {},
		"IfcPipeSegmentTypeEnum": {},
		"IfcPlateTypeEnum": {},
		"IfcProcedureTypeEnum": {},
		"IfcProfileTypeEnum": {},
		"IfcProjectOrderRecordTypeEnum": {},
		"IfcProjectOrderTypeEnum": {},
		"IfcProjectedOrTrueLengthEnum": {},
		"IfcPropertySourceEnum": {},
		"IfcProtectiveDeviceTypeEnum": {},
		"IfcPumpTypeEnum": {},
		"IfcRailingTypeEnum": {},
		"IfcRampFlightTypeEnum": {},
		"IfcRampTypeEnum": {},
		"IfcReflectanceMethodEnum": {},
		"IfcReinforcingBarRoleEnum": {},
		"IfcReinforcingBarSurfaceEnum": {},
		"IfcResourceConsumptionEnum": {},
		"IfcRibPlateDirectionEnum": {},
		"IfcRoleEnum": {},
		"IfcRoofTypeEnum": {},
		"IfcSIPrefix": {},
		"IfcSIUnitName": {},
		"IfcSanitaryTerminalTypeEnum": {},
		"IfcSectionTypeEnum": {},
		"IfcSensorTypeEnum": {},
		"IfcSequenceEnum": {},
		"IfcServiceLifeFactorTypeEnum": {},
		"IfcServiceLifeTypeEnum": {},
		"IfcSlabTypeEnum": {},
		"IfcSoundScaleEnum": {},
		"IfcSpaceHeaterTypeEnum": {},
		"IfcSpaceTypeEnum": {},
		"IfcStackTerminalTypeEnum": {},
		"IfcStairFlightTypeEnum": {},
		"IfcStairTypeEnum": {},
		"IfcStateEnum": {},
		"IfcStructuralCurveTypeEnum": {},
		"IfcStructuralSurfaceTypeEnum": {},
		"IfcSurfaceSide": {},
		"IfcSurfaceTextureEnum": {},
		"IfcSwitchingDeviceTypeEnum": {},
		"IfcTankTypeEnum": {},
		"IfcTendonTypeEnum": {},
		"IfcTextPath": {},
		"IfcThermalLoadSourceEnum": {},
		"IfcThermalLoadTypeEnum": {},
		"IfcTimeSeriesDataTypeEnum": {},
		"IfcTimeSeriesScheduleTypeEnum": {},
		"IfcTransformerTypeEnum": {},
		"IfcTransitionCode": {},
		"IfcTransportElementTypeEnum": {},
		"IfcTrimmingPreference": {},
		"IfcTubeBundleTypeEnum": {},
		"IfcUnitEnum": {},
		"IfcUnitaryEquipmentTypeEnum": {},
		"IfcValveTypeEnum": {},
		"IfcVibrationIsolatorTypeEnum": {},
		"IfcWallTypeEnum": {},
		"IfcWasteTerminalTypeEnum": {},
		"IfcWindowPanelOperationEnum": {},
		"IfcWindowPanelPositionEnum": {},
		"IfcWindowStyleConstructionEnum": {},
		"IfcWindowStyleOperationEnum": {},
		"IfcWorkControlTypeEnum": {},
		"IfcComplexNumber": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcMeasureValue"],
			"fields": {
				"wrappedValue": {
					"type": "double",
					"reference": false,
					"many": true,
					"inverse": false
				},
				"wrappedValueAsString": {
					"type": "string",
					"reference": false,
					"many": true,
					"inverse": false
				}
			}
		},
		"IfcNullStyle": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcPresentationStyleSelect"],
			"fields": {
				"wrappedValue": {
					"type": "enum",
					"reference": false,
					"many": false,
					"inverse": false
				}
			}
		},
		"IfcActorSelect": {
			"domain": "ifcactorresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcAppliedValueSelect": {
			"domain": "ifccostresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcAxis2Placement": {
			"domain": "ifcgeometryresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcBooleanOperand": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcCharacterStyleSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcClassificationNotationSelect": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcColour": {
			"domain": "ifcpresentationresource",
			"superclasses": ["IfcFillStyleSelect", "IfcSymbolStyleSelect"],
			"fields": {}
		},
		"IfcColourOrFactor": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcConditionCriterionSelect": {
			"domain": "ifcfacilitiesmgmtdomain",
			"superclasses": [],
			"fields": {}
		},
		"IfcCsgSelect": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcCurveFontOrScaledCurveFontSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcCurveOrEdgeCurve": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcCurveStyleFontSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": ["IfcCurveFontOrScaledCurveFontSelect"],
			"fields": {}
		},
		"IfcDateTimeSelect": {
			"domain": "ifcdatetimeresource",
			"superclasses": ["IfcMetricValueSelect"],
			"fields": {}
		},
		"IfcDefinedSymbolSelect": {
			"domain": "ifcpresentationdefinitionresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcDerivedMeasureValue": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcValue"],
			"fields": {}
		},
		"IfcDocumentSelect": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcDraughtingCalloutElement": {
			"domain": "ifcpresentationdimensioningresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcFillAreaStyleTileShapeSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcFillStyleSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcGeometricSetSelect": {
			"domain": "ifcgeometricmodelresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcHatchLineDistanceSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcLayeredItem": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcLibrarySelect": {
			"domain": "ifcexternalreferenceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcLightDistributionDataSourceSelect": {
			"domain": "ifcpresentationorganizationresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcMaterialSelect": {
			"domain": "ifcmaterialresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcMeasureValue": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcValue"],
			"fields": {}
		},
		"IfcMetricValueSelect": {
			"domain": "ifcconstraintresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcObjectReferenceSelect": {
			"domain": "ifcpropertyresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcOrientationSelect": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": [],
			"fields": {}
		},
		"IfcPointOrVertexPoint": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcPresentationStyleSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcShell": {
			"domain": "ifctopologyresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcSimpleValue": {
			"domain": "ifcmeasureresource",
			"superclasses": ["IfcValue"],
			"fields": {}
		},
		"IfcSizeSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcSpecularHighlightSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcStructuralActivityAssignmentSelect": {
			"domain": "ifcstructuralanalysisdomain",
			"superclasses": [],
			"fields": {}
		},
		"IfcSurfaceOrFaceSurface": {
			"domain": "ifcgeometricconstraintresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcSurfaceStyleElementSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcSymbolStyleSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcTextFontSelect": {
			"domain": "ifcpresentationresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcTextStyleSelect": {
			"domain": "ifcpresentationappearanceresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcTrimmingSelect": {
			"domain": "ifcgeometryresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcUnit": {
			"domain": "ifcmeasureresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcValue": {
			"domain": "ifcmeasureresource",
			"superclasses": [],
			"fields": {}
		},
		"IfcVectorOrDirection": {
			"domain": "ifcgeometryresource",
			"superclasses": [],
			"fields": {}
		}
	}
};

var ifc4={"classes":{"Tristate":{},"IfcActionRequest":{"domain":"ifcsharedmgmtelements","superclasses":["IfcControl"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"Status":{"type":"string","reference":false,"many":false,"inverse":false},"LongDescription":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcActor":{"domain":"ifckernel","superclasses":["IfcObject"],"fields":{"TheActor":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"IsActingUpon":{"type":"IfcRelAssignsToActor","reference":true,"many":true,"inverse":true}}},"IfcActorRole":{"domain":"ifcactorresource","superclasses":["IfcResourceObjectSelect"],"fields":{"Role":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedRole":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"HasExternalReference":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true}}},"IfcActuator":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcActuatorType":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAddress":{"domain":"ifcactorresource","superclasses":["IfcObjectReferenceSelect"],"fields":{"Purpose":{"type":"enum","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"UserDefinedPurpose":{"type":"string","reference":false,"many":false,"inverse":false},"OfPerson":{"type":"IfcPerson","reference":true,"many":true,"inverse":true},"OfOrganization":{"type":"IfcOrganization","reference":true,"many":true,"inverse":true}}},"IfcAdvancedBrep":{"domain":"ifcgeometricmodelresource","superclasses":["IfcManifoldSolidBrep"],"fields":{}},"IfcAdvancedBrepWithVoids":{"domain":"ifcgeometricmodelresource","superclasses":["IfcAdvancedBrep"],"fields":{"Voids":{"type":"IfcClosedShell","reference":true,"many":true,"inverse":false}}},"IfcAdvancedFace":{"domain":"ifctopologyresource","superclasses":["IfcFaceSurface"],"fields":{}},"IfcAirTerminal":{"domain":"ifchvacdomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAirTerminalBox":{"domain":"ifchvacdomain","superclasses":["IfcFlowController"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAirTerminalBoxType":{"domain":"ifchvacdomain","superclasses":["IfcFlowControllerType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAirTerminalType":{"domain":"ifchvacdomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAirToAirHeatRecovery":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAirToAirHeatRecoveryType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAlarm":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAlarmType":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAnnotation":{"domain":"ifcproductextension","superclasses":["IfcProduct"],"fields":{"ContainedInStructure":{"type":"IfcRelContainedInSpatialStructure","reference":true,"many":true,"inverse":true}}},"IfcAnnotationFillArea":{"domain":"ifcpresentationdefinitionresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"OuterBoundary":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"InnerBoundaries":{"type":"IfcCurve","reference":true,"many":true,"inverse":false}}},"IfcApplication":{"domain":"ifcutilityresource","superclasses":[],"fields":{"ApplicationDeveloper":{"type":"IfcOrganization","reference":true,"many":false,"inverse":false},"Version":{"type":"string","reference":false,"many":false,"inverse":false},"ApplicationFullName":{"type":"string","reference":false,"many":false,"inverse":false},"ApplicationIdentifier":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcAppliedValue":{"domain":"ifccostresource","superclasses":["IfcMetricValueSelect","IfcObjectReferenceSelect","IfcResourceObjectSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"AppliedValue":{"type":"IfcAppliedValueSelect","reference":true,"many":false,"inverse":false},"UnitBasis":{"type":"IfcMeasureWithUnit","reference":true,"many":false,"inverse":false},"ApplicableDate":{"type":"string","reference":false,"many":false,"inverse":false},"FixedUntilDate":{"type":"string","reference":false,"many":false,"inverse":false},"Category":{"type":"string","reference":false,"many":false,"inverse":false},"Condition":{"type":"string","reference":false,"many":false,"inverse":false},"ArithmeticOperator":{"type":"enum","reference":false,"many":false,"inverse":false},"Components":{"type":"IfcAppliedValue","reference":true,"many":true,"inverse":false},"HasExternalReference":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true}}},"IfcApproval":{"domain":"ifcapprovalresource","superclasses":["IfcResourceObjectSelect"],"fields":{"Identifier":{"type":"string","reference":false,"many":false,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"TimeOfApproval":{"type":"string","reference":false,"many":false,"inverse":false},"Status":{"type":"string","reference":false,"many":false,"inverse":false},"Level":{"type":"string","reference":false,"many":false,"inverse":false},"Qualifier":{"type":"string","reference":false,"many":false,"inverse":false},"RequestingApproval":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"GivingApproval":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"HasExternalReferences":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true},"ApprovedObjects":{"type":"IfcRelAssociatesApproval","reference":true,"many":true,"inverse":true},"ApprovedResources":{"type":"IfcResourceApprovalRelationship","reference":true,"many":true,"inverse":true},"IsRelatedWith":{"type":"IfcApprovalRelationship","reference":true,"many":true,"inverse":true},"Relates":{"type":"IfcApprovalRelationship","reference":true,"many":true,"inverse":true}}},"IfcApprovalRelationship":{"domain":"ifcapprovalresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"RelatingApproval":{"type":"IfcApproval","reference":true,"many":false,"inverse":true},"RelatedApprovals":{"type":"IfcApproval","reference":true,"many":true,"inverse":true}}},"IfcArbitraryClosedProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcProfileDef"],"fields":{"OuterCurve":{"type":"IfcCurve","reference":true,"many":false,"inverse":false}}},"IfcArbitraryOpenProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcProfileDef"],"fields":{"Curve":{"type":"IfcBoundedCurve","reference":true,"many":false,"inverse":false}}},"IfcArbitraryProfileDefWithVoids":{"domain":"ifcprofileresource","superclasses":["IfcArbitraryClosedProfileDef"],"fields":{"InnerCurves":{"type":"IfcCurve","reference":true,"many":true,"inverse":false}}},"IfcAsset":{"domain":"ifcsharedfacilitieselements","superclasses":["IfcGroup"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"OriginalValue":{"type":"IfcCostValue","reference":true,"many":false,"inverse":false},"CurrentValue":{"type":"IfcCostValue","reference":true,"many":false,"inverse":false},"TotalReplacementCost":{"type":"IfcCostValue","reference":true,"many":false,"inverse":false},"Owner":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"User":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"ResponsiblePerson":{"type":"IfcPerson","reference":true,"many":false,"inverse":false},"IncorporationDate":{"type":"string","reference":false,"many":false,"inverse":false},"DepreciatedValue":{"type":"IfcCostValue","reference":true,"many":false,"inverse":false}}},"IfcAsymmetricIShapeProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"BottomFlangeWidth":{"type":"double","reference":false,"many":false,"inverse":false},"BottomFlangeWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"OverallDepth":{"type":"double","reference":false,"many":false,"inverse":false},"OverallDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WebThickness":{"type":"double","reference":false,"many":false,"inverse":false},"WebThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BottomFlangeThickness":{"type":"double","reference":false,"many":false,"inverse":false},"BottomFlangeThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BottomFlangeFilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"BottomFlangeFilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TopFlangeWidth":{"type":"double","reference":false,"many":false,"inverse":false},"TopFlangeWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TopFlangeThickness":{"type":"double","reference":false,"many":false,"inverse":false},"TopFlangeThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TopFlangeFilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"TopFlangeFilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BottomFlangeEdgeRadius":{"type":"double","reference":false,"many":false,"inverse":false},"BottomFlangeEdgeRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BottomFlangeSlope":{"type":"double","reference":false,"many":false,"inverse":false},"BottomFlangeSlopeAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TopFlangeEdgeRadius":{"type":"double","reference":false,"many":false,"inverse":false},"TopFlangeEdgeRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TopFlangeSlope":{"type":"double","reference":false,"many":false,"inverse":false},"TopFlangeSlopeAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcAudioVisualAppliance":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAudioVisualApplianceType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAxis1Placement":{"domain":"ifcgeometryresource","superclasses":["IfcPlacement"],"fields":{"Axis":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcAxis2Placement2D":{"domain":"ifcgeometryresource","superclasses":["IfcPlacement","IfcAxis2Placement"],"fields":{"RefDirection":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcAxis2Placement3D":{"domain":"ifcgeometryresource","superclasses":["IfcPlacement","IfcAxis2Placement"],"fields":{"Axis":{"type":"IfcDirection","reference":true,"many":false,"inverse":false},"RefDirection":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcBSplineCurve":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedCurve"],"fields":{"Degree":{"type":"long","reference":false,"many":false,"inverse":false},"ControlPointsList":{"type":"IfcCartesianPoint","reference":true,"many":true,"inverse":false},"CurveForm":{"type":"enum","reference":false,"many":false,"inverse":false},"ClosedCurve":{"type":"enum","reference":false,"many":false,"inverse":false},"SelfIntersect":{"type":"enum","reference":false,"many":false,"inverse":false},"UpperIndexOnControlPoints":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcBSplineCurveWithKnots":{"domain":"ifcgeometryresource","superclasses":["IfcBSplineCurve"],"fields":{"KnotMultiplicities":{"type":"long","reference":false,"many":true,"inverse":false},"Knots":{"type":"double","reference":false,"many":true,"inverse":false},"KnotsAsString":{"type":"string","reference":false,"many":true,"inverse":false},"KnotSpec":{"type":"enum","reference":false,"many":false,"inverse":false},"UpperIndexOnKnots":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcBSplineSurface":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedSurface"],"fields":{"UDegree":{"type":"long","reference":false,"many":false,"inverse":false},"VDegree":{"type":"long","reference":false,"many":false,"inverse":false},"ControlPointsList":{"type":"ListOfIfcCartesianPoint","reference":true,"many":true,"inverse":false},"SurfaceForm":{"type":"enum","reference":false,"many":false,"inverse":false},"UClosed":{"type":"enum","reference":false,"many":false,"inverse":false},"VClosed":{"type":"enum","reference":false,"many":false,"inverse":false},"SelfIntersect":{"type":"enum","reference":false,"many":false,"inverse":false},"UUpper":{"type":"long","reference":false,"many":false,"inverse":false},"VUpper":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcBSplineSurfaceWithKnots":{"domain":"ifcgeometryresource","superclasses":["IfcBSplineSurface"],"fields":{"UMultiplicities":{"type":"long","reference":false,"many":true,"inverse":false},"VMultiplicities":{"type":"long","reference":false,"many":true,"inverse":false},"UKnots":{"type":"double","reference":false,"many":true,"inverse":false},"UKnotsAsString":{"type":"string","reference":false,"many":true,"inverse":false},"VKnots":{"type":"double","reference":false,"many":true,"inverse":false},"VKnotsAsString":{"type":"string","reference":false,"many":true,"inverse":false},"KnotSpec":{"type":"enum","reference":false,"many":false,"inverse":false},"KnotVUpper":{"type":"long","reference":false,"many":false,"inverse":false},"KnotUUpper":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcBeam":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBeamStandardCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcBeam"],"fields":{}},"IfcBeamType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBlobTexture":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcSurfaceTexture"],"fields":{"RasterFormat":{"type":"string","reference":false,"many":false,"inverse":false},"RasterCode":{"type":"bytearray","reference":false,"many":false,"inverse":false}}},"IfcBlock":{"domain":"ifcgeometricmodelresource","superclasses":["IfcCsgPrimitive3D"],"fields":{"XLength":{"type":"double","reference":false,"many":false,"inverse":false},"XLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"YLength":{"type":"double","reference":false,"many":false,"inverse":false},"YLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ZLength":{"type":"double","reference":false,"many":false,"inverse":false},"ZLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcBoiler":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBoilerType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBooleanClippingResult":{"domain":"ifcgeometricmodelresource","superclasses":["IfcBooleanResult"],"fields":{}},"IfcBooleanResult":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem","IfcBooleanOperand","IfcCsgSelect"],"fields":{"Operator":{"type":"enum","reference":false,"many":false,"inverse":false},"FirstOperand":{"type":"IfcBooleanOperand","reference":true,"many":false,"inverse":false},"SecondOperand":{"type":"IfcBooleanOperand","reference":true,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcBoundaryCondition":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcBoundaryCurve":{"domain":"ifcgeometryresource","superclasses":["IfcCompositeCurveOnSurface"],"fields":{}},"IfcBoundaryEdgeCondition":{"domain":"ifcstructuralloadresource","superclasses":["IfcBoundaryCondition"],"fields":{"TranslationalStiffnessByLengthX":{"type":"IfcModulusOfTranslationalSubgradeReactionSelect","reference":true,"many":false,"inverse":false},"TranslationalStiffnessByLengthY":{"type":"IfcModulusOfTranslationalSubgradeReactionSelect","reference":true,"many":false,"inverse":false},"TranslationalStiffnessByLengthZ":{"type":"IfcModulusOfTranslationalSubgradeReactionSelect","reference":true,"many":false,"inverse":false},"RotationalStiffnessByLengthX":{"type":"IfcModulusOfRotationalSubgradeReactionSelect","reference":true,"many":false,"inverse":false},"RotationalStiffnessByLengthY":{"type":"IfcModulusOfRotationalSubgradeReactionSelect","reference":true,"many":false,"inverse":false},"RotationalStiffnessByLengthZ":{"type":"IfcModulusOfRotationalSubgradeReactionSelect","reference":true,"many":false,"inverse":false}}},"IfcBoundaryFaceCondition":{"domain":"ifcstructuralloadresource","superclasses":["IfcBoundaryCondition"],"fields":{"TranslationalStiffnessByAreaX":{"type":"IfcModulusOfSubgradeReactionSelect","reference":true,"many":false,"inverse":false},"TranslationalStiffnessByAreaY":{"type":"IfcModulusOfSubgradeReactionSelect","reference":true,"many":false,"inverse":false},"TranslationalStiffnessByAreaZ":{"type":"IfcModulusOfSubgradeReactionSelect","reference":true,"many":false,"inverse":false}}},"IfcBoundaryNodeCondition":{"domain":"ifcstructuralloadresource","superclasses":["IfcBoundaryCondition"],"fields":{"TranslationalStiffnessX":{"type":"IfcTranslationalStiffnessSelect","reference":true,"many":false,"inverse":false},"TranslationalStiffnessY":{"type":"IfcTranslationalStiffnessSelect","reference":true,"many":false,"inverse":false},"TranslationalStiffnessZ":{"type":"IfcTranslationalStiffnessSelect","reference":true,"many":false,"inverse":false},"RotationalStiffnessX":{"type":"IfcRotationalStiffnessSelect","reference":true,"many":false,"inverse":false},"RotationalStiffnessY":{"type":"IfcRotationalStiffnessSelect","reference":true,"many":false,"inverse":false},"RotationalStiffnessZ":{"type":"IfcRotationalStiffnessSelect","reference":true,"many":false,"inverse":false}}},"IfcBoundaryNodeConditionWarping":{"domain":"ifcstructuralloadresource","superclasses":["IfcBoundaryNodeCondition"],"fields":{"WarpingStiffness":{"type":"IfcWarpingStiffnessSelect","reference":true,"many":false,"inverse":false}}},"IfcBoundedCurve":{"domain":"ifcgeometryresource","superclasses":["IfcCurve","IfcCurveOrEdgeCurve"],"fields":{}},"IfcBoundedSurface":{"domain":"ifcgeometryresource","superclasses":["IfcSurface"],"fields":{}},"IfcBoundingBox":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"Corner":{"type":"IfcCartesianPoint","reference":true,"many":false,"inverse":false},"XDim":{"type":"double","reference":false,"many":false,"inverse":false},"XDimAsString":{"type":"string","reference":false,"many":false,"inverse":false},"YDim":{"type":"double","reference":false,"many":false,"inverse":false},"YDimAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ZDim":{"type":"double","reference":false,"many":false,"inverse":false},"ZDimAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcBoxedHalfSpace":{"domain":"ifcgeometricmodelresource","superclasses":["IfcHalfSpaceSolid"],"fields":{"Enclosure":{"type":"IfcBoundingBox","reference":true,"many":false,"inverse":false}}},"IfcBuilding":{"domain":"ifcproductextension","superclasses":["IfcSpatialStructureElement"],"fields":{"ElevationOfRefHeight":{"type":"double","reference":false,"many":false,"inverse":false},"ElevationOfRefHeightAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ElevationOfTerrain":{"type":"double","reference":false,"many":false,"inverse":false},"ElevationOfTerrainAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BuildingAddress":{"type":"IfcPostalAddress","reference":true,"many":false,"inverse":false}}},"IfcBuildingElement":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{}},"IfcBuildingElementPart":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementComponent"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBuildingElementPartType":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementComponentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBuildingElementProxy":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBuildingElementProxyType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBuildingElementType":{"domain":"ifcproductextension","superclasses":["IfcElementType"],"fields":{}},"IfcBuildingStorey":{"domain":"ifcproductextension","superclasses":["IfcSpatialStructureElement"],"fields":{"Elevation":{"type":"double","reference":false,"many":false,"inverse":false},"ElevationAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcBuildingSystem":{"domain":"ifcsharedbldgelements","superclasses":["IfcSystem"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"LongName":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcBurner":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcBurnerType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCShapeProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"Depth":{"type":"double","reference":false,"many":false,"inverse":false},"DepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Width":{"type":"double","reference":false,"many":false,"inverse":false},"WidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WallThickness":{"type":"double","reference":false,"many":false,"inverse":false},"WallThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Girth":{"type":"double","reference":false,"many":false,"inverse":false},"GirthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"InternalFilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"InternalFilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCableCarrierFitting":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowFitting"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCableCarrierFittingType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowFittingType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCableCarrierSegment":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowSegment"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCableCarrierSegmentType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowSegmentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCableFitting":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowFitting"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCableFittingType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowFittingType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCableSegment":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowSegment"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCableSegmentType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowSegmentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCartesianPoint":{"domain":"ifcgeometryresource","superclasses":["IfcPoint","IfcTrimmingSelect"],"fields":{"Coordinates":{"type":"double","reference":false,"many":true,"inverse":false},"CoordinatesAsString":{"type":"string","reference":false,"many":true,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcCartesianPointList":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcCartesianPointList2D":{"domain":"ifcgeometricmodelresource","superclasses":["IfcCartesianPointList"],"fields":{"CoordList":{"type":"ListOfIfcCartesianPoint","reference":true,"many":true,"inverse":false}}},"IfcCartesianPointList3D":{"domain":"ifcgeometricmodelresource","superclasses":["IfcCartesianPointList"],"fields":{"CoordList":{"type":"ListOfIfcLengthMeasure","reference":true,"many":true,"inverse":false}}},"IfcCartesianTransformationOperator":{"domain":"ifcgeometryresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"Axis1":{"type":"IfcDirection","reference":true,"many":false,"inverse":false},"Axis2":{"type":"IfcDirection","reference":true,"many":false,"inverse":false},"LocalOrigin":{"type":"IfcCartesianPoint","reference":true,"many":false,"inverse":false},"Scale":{"type":"double","reference":false,"many":false,"inverse":false},"ScaleAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false},"Scl":{"type":"double","reference":false,"many":false,"inverse":false},"SclAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCartesianTransformationOperator2D":{"domain":"ifcgeometryresource","superclasses":["IfcCartesianTransformationOperator"],"fields":{}},"IfcCartesianTransformationOperator2DnonUniform":{"domain":"ifcgeometryresource","superclasses":["IfcCartesianTransformationOperator2D"],"fields":{"Scale2":{"type":"double","reference":false,"many":false,"inverse":false},"Scale2AsString":{"type":"string","reference":false,"many":false,"inverse":false},"Scl2":{"type":"double","reference":false,"many":false,"inverse":false},"Scl2AsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCartesianTransformationOperator3D":{"domain":"ifcgeometryresource","superclasses":["IfcCartesianTransformationOperator"],"fields":{"Axis3":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcCartesianTransformationOperator3DnonUniform":{"domain":"ifcgeometryresource","superclasses":["IfcCartesianTransformationOperator3D"],"fields":{"Scale2":{"type":"double","reference":false,"many":false,"inverse":false},"Scale2AsString":{"type":"string","reference":false,"many":false,"inverse":false},"Scale3":{"type":"double","reference":false,"many":false,"inverse":false},"Scale3AsString":{"type":"string","reference":false,"many":false,"inverse":false},"Scl3":{"type":"double","reference":false,"many":false,"inverse":false},"Scl3AsString":{"type":"string","reference":false,"many":false,"inverse":false},"Scl2":{"type":"double","reference":false,"many":false,"inverse":false},"Scl2AsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCenterLineProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcArbitraryOpenProfileDef"],"fields":{"Thickness":{"type":"double","reference":false,"many":false,"inverse":false},"ThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcChiller":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcChillerType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcChimney":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcChimneyType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCircle":{"domain":"ifcgeometryresource","superclasses":["IfcConic"],"fields":{"Radius":{"type":"double","reference":false,"many":false,"inverse":false},"RadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCircleHollowProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcCircleProfileDef"],"fields":{"WallThickness":{"type":"double","reference":false,"many":false,"inverse":false},"WallThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCircleProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"Radius":{"type":"double","reference":false,"many":false,"inverse":false},"RadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCivilElement":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{}},"IfcCivilElementType":{"domain":"ifcproductextension","superclasses":["IfcElementType"],"fields":{}},"IfcClassification":{"domain":"ifcexternalreferenceresource","superclasses":["IfcExternalInformation","IfcClassificationReferenceSelect","IfcClassificationSelect"],"fields":{"Source":{"type":"string","reference":false,"many":false,"inverse":false},"Edition":{"type":"string","reference":false,"many":false,"inverse":false},"EditionDate":{"type":"string","reference":false,"many":false,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Location":{"type":"string","reference":false,"many":false,"inverse":false},"ReferenceTokens":{"type":"string","reference":false,"many":true,"inverse":false},"ClassificationForObjects":{"type":"IfcRelAssociatesClassification","reference":true,"many":true,"inverse":true},"HasReferences":{"type":"IfcClassificationReference","reference":true,"many":true,"inverse":true}}},"IfcClassificationReference":{"domain":"ifcexternalreferenceresource","superclasses":["IfcExternalReference","IfcClassificationReferenceSelect","IfcClassificationSelect"],"fields":{"ReferencedSource":{"type":"IfcClassificationReferenceSelect","reference":true,"many":false,"inverse":true},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Sort":{"type":"string","reference":false,"many":false,"inverse":false},"ClassificationRefForObjects":{"type":"IfcRelAssociatesClassification","reference":true,"many":true,"inverse":true},"HasReferences":{"type":"IfcClassificationReference","reference":true,"many":true,"inverse":true}}},"IfcClosedShell":{"domain":"ifctopologyresource","superclasses":["IfcConnectedFaceSet","IfcShell","IfcSolidOrShell"],"fields":{}},"IfcCoil":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCoilType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcColourRgb":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcColourSpecification","IfcColourOrFactor"],"fields":{"Red":{"type":"double","reference":false,"many":false,"inverse":false},"RedAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Green":{"type":"double","reference":false,"many":false,"inverse":false},"GreenAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Blue":{"type":"double","reference":false,"many":false,"inverse":false},"BlueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcColourRgbList":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"ColourList":{"type":"ListOfIfcNormalisedRatioMeasure","reference":true,"many":true,"inverse":false}}},"IfcColourSpecification":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem","IfcColour"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcColumn":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcColumnStandardCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcColumn"],"fields":{}},"IfcColumnType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCommunicationsAppliance":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCommunicationsApplianceType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcComplexProperty":{"domain":"ifcpropertyresource","superclasses":["IfcProperty"],"fields":{"UsageName":{"type":"string","reference":false,"many":false,"inverse":false},"HasProperties":{"type":"IfcProperty","reference":true,"many":true,"inverse":true}}},"IfcComplexPropertyTemplate":{"domain":"ifckernel","superclasses":["IfcPropertyTemplate"],"fields":{"UsageName":{"type":"string","reference":false,"many":false,"inverse":false},"TemplateType":{"type":"enum","reference":false,"many":false,"inverse":false},"HasPropertyTemplates":{"type":"IfcPropertyTemplate","reference":true,"many":true,"inverse":true}}},"IfcCompositeCurve":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedCurve"],"fields":{"Segments":{"type":"IfcCompositeCurveSegment","reference":true,"many":true,"inverse":true},"SelfIntersect":{"type":"enum","reference":false,"many":false,"inverse":false},"ClosedCurve":{"type":"enum","reference":false,"many":false,"inverse":false},"NSegments":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcCompositeCurveOnSurface":{"domain":"ifcgeometryresource","superclasses":["IfcCompositeCurve","IfcCurveOnSurface"],"fields":{}},"IfcCompositeCurveSegment":{"domain":"ifcgeometryresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"Transition":{"type":"enum","reference":false,"many":false,"inverse":false},"SameSense":{"type":"enum","reference":false,"many":false,"inverse":false},"ParentCurve":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"UsingCurves":{"type":"IfcCompositeCurve","reference":true,"many":true,"inverse":true},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcCompositeProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcProfileDef"],"fields":{"Profiles":{"type":"IfcProfileDef","reference":true,"many":true,"inverse":false},"Label":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCompressor":{"domain":"ifchvacdomain","superclasses":["IfcFlowMovingDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCompressorType":{"domain":"ifchvacdomain","superclasses":["IfcFlowMovingDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCondenser":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCondenserType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcConic":{"domain":"ifcgeometryresource","superclasses":["IfcCurve"],"fields":{"Position":{"type":"IfcAxis2Placement","reference":true,"many":false,"inverse":false}}},"IfcConnectedFaceSet":{"domain":"ifctopologyresource","superclasses":["IfcTopologicalRepresentationItem"],"fields":{"CfsFaces":{"type":"IfcFace","reference":true,"many":true,"inverse":false}}},"IfcConnectionCurveGeometry":{"domain":"ifcgeometricconstraintresource","superclasses":["IfcConnectionGeometry"],"fields":{"CurveOnRelatingElement":{"type":"IfcCurveOrEdgeCurve","reference":true,"many":false,"inverse":false},"CurveOnRelatedElement":{"type":"IfcCurveOrEdgeCurve","reference":true,"many":false,"inverse":false}}},"IfcConnectionGeometry":{"domain":"ifcgeometricconstraintresource","superclasses":[],"fields":{}},"IfcConnectionPointEccentricity":{"domain":"ifcgeometricconstraintresource","superclasses":["IfcConnectionPointGeometry"],"fields":{"EccentricityInX":{"type":"double","reference":false,"many":false,"inverse":false},"EccentricityInXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"EccentricityInY":{"type":"double","reference":false,"many":false,"inverse":false},"EccentricityInYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"EccentricityInZ":{"type":"double","reference":false,"many":false,"inverse":false},"EccentricityInZAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcConnectionPointGeometry":{"domain":"ifcgeometricconstraintresource","superclasses":["IfcConnectionGeometry"],"fields":{"PointOnRelatingElement":{"type":"IfcPointOrVertexPoint","reference":true,"many":false,"inverse":false},"PointOnRelatedElement":{"type":"IfcPointOrVertexPoint","reference":true,"many":false,"inverse":false}}},"IfcConnectionSurfaceGeometry":{"domain":"ifcgeometricconstraintresource","superclasses":["IfcConnectionGeometry"],"fields":{"SurfaceOnRelatingElement":{"type":"IfcSurfaceOrFaceSurface","reference":true,"many":false,"inverse":false},"SurfaceOnRelatedElement":{"type":"IfcSurfaceOrFaceSurface","reference":true,"many":false,"inverse":false}}},"IfcConnectionVolumeGeometry":{"domain":"ifcgeometricconstraintresource","superclasses":["IfcConnectionGeometry"],"fields":{"VolumeOnRelatingElement":{"type":"IfcSolidOrShell","reference":true,"many":false,"inverse":false},"VolumeOnRelatedElement":{"type":"IfcSolidOrShell","reference":true,"many":false,"inverse":false}}},"IfcConstraint":{"domain":"ifcconstraintresource","superclasses":["IfcResourceObjectSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"ConstraintGrade":{"type":"enum","reference":false,"many":false,"inverse":false},"ConstraintSource":{"type":"string","reference":false,"many":false,"inverse":false},"CreatingActor":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"CreationTime":{"type":"string","reference":false,"many":false,"inverse":false},"UserDefinedGrade":{"type":"string","reference":false,"many":false,"inverse":false},"HasExternalReferences":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true},"PropertiesForConstraint":{"type":"IfcResourceConstraintRelationship","reference":true,"many":true,"inverse":true}}},"IfcConstructionEquipmentResource":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResource"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcConstructionEquipmentResourceType":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResourceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcConstructionMaterialResource":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResource"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcConstructionMaterialResourceType":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResourceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcConstructionProductResource":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResource"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcConstructionProductResourceType":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResourceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcConstructionResource":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcResource"],"fields":{"Usage":{"type":"IfcResourceTime","reference":true,"many":false,"inverse":false},"BaseCosts":{"type":"IfcAppliedValue","reference":true,"many":true,"inverse":false},"BaseQuantity":{"type":"IfcPhysicalQuantity","reference":true,"many":false,"inverse":false}}},"IfcConstructionResourceType":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcTypeResource"],"fields":{"BaseCosts":{"type":"IfcAppliedValue","reference":true,"many":true,"inverse":false},"BaseQuantity":{"type":"IfcPhysicalQuantity","reference":true,"many":false,"inverse":false}}},"IfcContext":{"domain":"ifckernel","superclasses":["IfcObjectDefinition"],"fields":{"ObjectType":{"type":"string","reference":false,"many":false,"inverse":false},"LongName":{"type":"string","reference":false,"many":false,"inverse":false},"Phase":{"type":"string","reference":false,"many":false,"inverse":false},"RepresentationContexts":{"type":"IfcRepresentationContext","reference":true,"many":true,"inverse":false},"UnitsInContext":{"type":"IfcUnitAssignment","reference":true,"many":false,"inverse":false},"IsDefinedBy":{"type":"IfcRelDefinesByProperties","reference":true,"many":true,"inverse":true},"Declares":{"type":"IfcRelDeclares","reference":true,"many":true,"inverse":true}}},"IfcContextDependentUnit":{"domain":"ifcmeasureresource","superclasses":["IfcNamedUnit","IfcResourceObjectSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"HasExternalReference":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true}}},"IfcControl":{"domain":"ifckernel","superclasses":["IfcObject"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"Controls":{"type":"IfcRelAssignsToControl","reference":true,"many":true,"inverse":true}}},"IfcController":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcControllerType":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcConversionBasedUnit":{"domain":"ifcmeasureresource","superclasses":["IfcNamedUnit","IfcResourceObjectSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"ConversionFactor":{"type":"IfcMeasureWithUnit","reference":true,"many":false,"inverse":false},"HasExternalReference":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true}}},"IfcConversionBasedUnitWithOffset":{"domain":"ifcmeasureresource","superclasses":["IfcConversionBasedUnit"],"fields":{"ConversionOffset":{"type":"double","reference":false,"many":false,"inverse":false},"ConversionOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCooledBeam":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCooledBeamType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCoolingTower":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCoolingTowerType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCoordinateOperation":{"domain":"ifcrepresentationresource","superclasses":[],"fields":{"SourceCRS":{"type":"IfcCoordinateReferenceSystemSelect","reference":true,"many":false,"inverse":true},"TargetCRS":{"type":"IfcCoordinateReferenceSystem","reference":true,"many":false,"inverse":false}}},"IfcCoordinateReferenceSystem":{"domain":"ifcrepresentationresource","superclasses":["IfcCoordinateReferenceSystemSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"GeodeticDatum":{"type":"string","reference":false,"many":false,"inverse":false},"VerticalDatum":{"type":"string","reference":false,"many":false,"inverse":false},"HasCoordinateOperation":{"type":"IfcCoordinateOperation","reference":true,"many":true,"inverse":true}}},"IfcCostItem":{"domain":"ifcsharedmgmtelements","superclasses":["IfcControl"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"CostValues":{"type":"IfcCostValue","reference":true,"many":true,"inverse":false},"CostQuantities":{"type":"IfcPhysicalQuantity","reference":true,"many":true,"inverse":false}}},"IfcCostSchedule":{"domain":"ifcsharedmgmtelements","superclasses":["IfcControl"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"Status":{"type":"string","reference":false,"many":false,"inverse":false},"SubmittedOn":{"type":"string","reference":false,"many":false,"inverse":false},"UpdateDate":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCostValue":{"domain":"ifccostresource","superclasses":["IfcAppliedValue"],"fields":{}},"IfcCovering":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"CoversSpaces":{"type":"IfcRelCoversSpaces","reference":true,"many":true,"inverse":true},"CoversElements":{"type":"IfcRelCoversBldgElements","reference":true,"many":true,"inverse":true}}},"IfcCoveringType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCrewResource":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResource"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCrewResourceType":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResourceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCsgPrimitive3D":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem","IfcBooleanOperand","IfcCsgSelect"],"fields":{"Position":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcCsgSolid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSolidModel"],"fields":{"TreeRootExpression":{"type":"IfcCsgSelect","reference":true,"many":false,"inverse":false}}},"IfcCurrencyRelationship":{"domain":"ifccostresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"RelatingMonetaryUnit":{"type":"IfcMonetaryUnit","reference":true,"many":false,"inverse":false},"RelatedMonetaryUnit":{"type":"IfcMonetaryUnit","reference":true,"many":false,"inverse":false},"ExchangeRate":{"type":"double","reference":false,"many":false,"inverse":false},"ExchangeRateAsString":{"type":"string","reference":false,"many":false,"inverse":false},"RateDateTime":{"type":"string","reference":false,"many":false,"inverse":false},"RateSource":{"type":"IfcLibraryInformation","reference":true,"many":false,"inverse":false}}},"IfcCurtainWall":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCurtainWallType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCurve":{"domain":"ifcgeometryresource","superclasses":["IfcGeometricRepresentationItem","IfcGeometricSetSelect"],"fields":{"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcCurveBoundedPlane":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedSurface"],"fields":{"BasisSurface":{"type":"IfcPlane","reference":true,"many":false,"inverse":false},"OuterBoundary":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"InnerBoundaries":{"type":"IfcCurve","reference":true,"many":true,"inverse":false}}},"IfcCurveBoundedSurface":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedSurface"],"fields":{"BasisSurface":{"type":"IfcSurface","reference":true,"many":false,"inverse":false},"Boundaries":{"type":"IfcBoundaryCurve","reference":true,"many":true,"inverse":false},"ImplicitOuter":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCurveStyle":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationStyle","IfcPresentationStyleSelect"],"fields":{"CurveFont":{"type":"IfcCurveFontOrScaledCurveFontSelect","reference":true,"many":false,"inverse":false},"CurveWidth":{"type":"IfcSizeSelect","reference":true,"many":false,"inverse":false},"CurveColour":{"type":"IfcColour","reference":true,"many":false,"inverse":false},"ModelOrDraughting":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCurveStyleFont":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem","IfcCurveStyleFontSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"PatternList":{"type":"IfcCurveStyleFontPattern","reference":true,"many":true,"inverse":false}}},"IfcCurveStyleFontAndScaling":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem","IfcCurveFontOrScaledCurveFontSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"CurveFont":{"type":"IfcCurveStyleFontSelect","reference":true,"many":false,"inverse":false},"CurveFontScaling":{"type":"double","reference":false,"many":false,"inverse":false},"CurveFontScalingAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCurveStyleFontPattern":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"VisibleSegmentLength":{"type":"double","reference":false,"many":false,"inverse":false},"VisibleSegmentLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"InvisibleSegmentLength":{"type":"double","reference":false,"many":false,"inverse":false},"InvisibleSegmentLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCylindricalSurface":{"domain":"ifcgeometryresource","superclasses":["IfcElementarySurface"],"fields":{"Radius":{"type":"double","reference":false,"many":false,"inverse":false},"RadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDamper":{"domain":"ifchvacdomain","superclasses":["IfcFlowController"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDamperType":{"domain":"ifchvacdomain","superclasses":["IfcFlowControllerType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDerivedProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcProfileDef"],"fields":{"ParentProfile":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":false},"Operator":{"type":"IfcCartesianTransformationOperator2D","reference":true,"many":false,"inverse":false},"Label":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDerivedUnit":{"domain":"ifcmeasureresource","superclasses":["IfcUnit"],"fields":{"Elements":{"type":"IfcDerivedUnitElement","reference":true,"many":true,"inverse":false},"UnitType":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDerivedUnitElement":{"domain":"ifcmeasureresource","superclasses":[],"fields":{"Unit":{"type":"IfcNamedUnit","reference":true,"many":false,"inverse":false},"Exponent":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcDimensionalExponents":{"domain":"ifcmeasureresource","superclasses":[],"fields":{"LengthExponent":{"type":"long","reference":false,"many":false,"inverse":false},"MassExponent":{"type":"long","reference":false,"many":false,"inverse":false},"TimeExponent":{"type":"long","reference":false,"many":false,"inverse":false},"ElectricCurrentExponent":{"type":"long","reference":false,"many":false,"inverse":false},"ThermodynamicTemperatureExponent":{"type":"long","reference":false,"many":false,"inverse":false},"AmountOfSubstanceExponent":{"type":"long","reference":false,"many":false,"inverse":false},"LuminousIntensityExponent":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcDirection":{"domain":"ifcgeometryresource","superclasses":["IfcGeometricRepresentationItem","IfcGridPlacementDirectionSelect","IfcVectorOrDirection"],"fields":{"DirectionRatios":{"type":"double","reference":false,"many":true,"inverse":false},"DirectionRatiosAsString":{"type":"string","reference":false,"many":true,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcDiscreteAccessory":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementComponent"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDiscreteAccessoryType":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementComponentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDistributionChamberElement":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDistributionChamberElementType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDistributionCircuit":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionSystem"],"fields":{}},"IfcDistributionControlElement":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionElement"],"fields":{"AssignedToFlowElement":{"type":"IfcRelFlowControlElements","reference":true,"many":true,"inverse":true}}},"IfcDistributionControlElementType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionElementType"],"fields":{}},"IfcDistributionElement":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{"HasPorts":{"type":"IfcRelConnectsPortToElement","reference":true,"many":true,"inverse":true}}},"IfcDistributionElementType":{"domain":"ifcproductextension","superclasses":["IfcElementType"],"fields":{}},"IfcDistributionFlowElement":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionElement"],"fields":{"HasControlElements":{"type":"IfcRelFlowControlElements","reference":true,"many":true,"inverse":true}}},"IfcDistributionFlowElementType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionElementType"],"fields":{}},"IfcDistributionPort":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcPort"],"fields":{"FlowDirection":{"type":"enum","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"SystemType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDistributionSystem":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcSystem"],"fields":{"LongName":{"type":"string","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDocumentInformation":{"domain":"ifcexternalreferenceresource","superclasses":["IfcExternalInformation","IfcDocumentSelect"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Location":{"type":"string","reference":false,"many":false,"inverse":false},"Purpose":{"type":"string","reference":false,"many":false,"inverse":false},"IntendedUse":{"type":"string","reference":false,"many":false,"inverse":false},"Scope":{"type":"string","reference":false,"many":false,"inverse":false},"Revision":{"type":"string","reference":false,"many":false,"inverse":false},"DocumentOwner":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"Editors":{"type":"IfcActorSelect","reference":true,"many":true,"inverse":false},"CreationTime":{"type":"string","reference":false,"many":false,"inverse":false},"LastRevisionTime":{"type":"string","reference":false,"many":false,"inverse":false},"ElectronicFormat":{"type":"string","reference":false,"many":false,"inverse":false},"ValidFrom":{"type":"string","reference":false,"many":false,"inverse":false},"ValidUntil":{"type":"string","reference":false,"many":false,"inverse":false},"Confidentiality":{"type":"enum","reference":false,"many":false,"inverse":false},"Status":{"type":"enum","reference":false,"many":false,"inverse":false},"DocumentInfoForObjects":{"type":"IfcRelAssociatesDocument","reference":true,"many":true,"inverse":true},"HasDocumentReferences":{"type":"IfcDocumentReference","reference":true,"many":true,"inverse":true},"IsPointedTo":{"type":"IfcDocumentInformationRelationship","reference":true,"many":true,"inverse":true},"IsPointer":{"type":"IfcDocumentInformationRelationship","reference":true,"many":true,"inverse":true}}},"IfcDocumentInformationRelationship":{"domain":"ifcexternalreferenceresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"RelatingDocument":{"type":"IfcDocumentInformation","reference":true,"many":false,"inverse":true},"RelatedDocuments":{"type":"IfcDocumentInformation","reference":true,"many":true,"inverse":true},"RelationshipType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDocumentReference":{"domain":"ifcexternalreferenceresource","superclasses":["IfcExternalReference","IfcDocumentSelect"],"fields":{"Description":{"type":"string","reference":false,"many":false,"inverse":false},"ReferencedDocument":{"type":"IfcDocumentInformation","reference":true,"many":false,"inverse":true},"DocumentRefForObjects":{"type":"IfcRelAssociatesDocument","reference":true,"many":true,"inverse":true}}},"IfcDoor":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"OverallHeight":{"type":"double","reference":false,"many":false,"inverse":false},"OverallHeightAsString":{"type":"string","reference":false,"many":false,"inverse":false},"OverallWidth":{"type":"double","reference":false,"many":false,"inverse":false},"OverallWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"OperationType":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedOperationType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDoorLiningProperties":{"domain":"ifcarchitecturedomain","superclasses":["IfcPreDefinedPropertySet"],"fields":{"LiningDepth":{"type":"double","reference":false,"many":false,"inverse":false},"LiningDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LiningThickness":{"type":"double","reference":false,"many":false,"inverse":false},"LiningThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ThresholdDepth":{"type":"double","reference":false,"many":false,"inverse":false},"ThresholdDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ThresholdThickness":{"type":"double","reference":false,"many":false,"inverse":false},"ThresholdThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransomThickness":{"type":"double","reference":false,"many":false,"inverse":false},"TransomThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransomOffset":{"type":"double","reference":false,"many":false,"inverse":false},"TransomOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LiningOffset":{"type":"double","reference":false,"many":false,"inverse":false},"LiningOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ThresholdOffset":{"type":"double","reference":false,"many":false,"inverse":false},"ThresholdOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CasingThickness":{"type":"double","reference":false,"many":false,"inverse":false},"CasingThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CasingDepth":{"type":"double","reference":false,"many":false,"inverse":false},"CasingDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ShapeAspectStyle":{"type":"IfcShapeAspect","reference":true,"many":false,"inverse":false},"LiningToPanelOffsetX":{"type":"double","reference":false,"many":false,"inverse":false},"LiningToPanelOffsetXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LiningToPanelOffsetY":{"type":"double","reference":false,"many":false,"inverse":false},"LiningToPanelOffsetYAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDoorPanelProperties":{"domain":"ifcarchitecturedomain","superclasses":["IfcPreDefinedPropertySet"],"fields":{"PanelDepth":{"type":"double","reference":false,"many":false,"inverse":false},"PanelDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PanelOperation":{"type":"enum","reference":false,"many":false,"inverse":false},"PanelWidth":{"type":"double","reference":false,"many":false,"inverse":false},"PanelWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PanelPosition":{"type":"enum","reference":false,"many":false,"inverse":false},"ShapeAspectStyle":{"type":"IfcShapeAspect","reference":true,"many":false,"inverse":false}}},"IfcDoorStandardCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcDoor"],"fields":{}},"IfcDoorStyle":{"domain":"ifcarchitecturedomain","superclasses":["IfcTypeProduct"],"fields":{"OperationType":{"type":"enum","reference":false,"many":false,"inverse":false},"ConstructionType":{"type":"enum","reference":false,"many":false,"inverse":false},"ParameterTakesPrecedence":{"type":"enum","reference":false,"many":false,"inverse":false},"Sizeable":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDoorType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"OperationType":{"type":"enum","reference":false,"many":false,"inverse":false},"ParameterTakesPrecedence":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedOperationType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDraughtingPreDefinedColour":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPreDefinedColour"],"fields":{}},"IfcDraughtingPreDefinedCurveFont":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPreDefinedCurveFont"],"fields":{}},"IfcDuctFitting":{"domain":"ifchvacdomain","superclasses":["IfcFlowFitting"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDuctFittingType":{"domain":"ifchvacdomain","superclasses":["IfcFlowFittingType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDuctSegment":{"domain":"ifchvacdomain","superclasses":["IfcFlowSegment"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDuctSegmentType":{"domain":"ifchvacdomain","superclasses":["IfcFlowSegmentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDuctSilencer":{"domain":"ifchvacdomain","superclasses":["IfcFlowTreatmentDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcDuctSilencerType":{"domain":"ifchvacdomain","superclasses":["IfcFlowTreatmentDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcEdge":{"domain":"ifctopologyresource","superclasses":["IfcTopologicalRepresentationItem"],"fields":{"EdgeStart":{"type":"IfcVertex","reference":true,"many":false,"inverse":false},"EdgeEnd":{"type":"IfcVertex","reference":true,"many":false,"inverse":false}}},"IfcEdgeCurve":{"domain":"ifctopologyresource","superclasses":["IfcEdge","IfcCurveOrEdgeCurve"],"fields":{"EdgeGeometry":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"SameSense":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcEdgeLoop":{"domain":"ifctopologyresource","superclasses":["IfcLoop"],"fields":{"EdgeList":{"type":"IfcOrientedEdge","reference":true,"many":true,"inverse":false},"Ne":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcElectricAppliance":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricApplianceType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricDistributionBoard":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowController"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricDistributionBoardType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowControllerType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricFlowStorageDevice":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowStorageDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricFlowStorageDeviceType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowStorageDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricGenerator":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricGeneratorType":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricMotor":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricMotorType":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricTimeControl":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowController"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElectricTimeControlType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowControllerType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElement":{"domain":"ifcproductextension","superclasses":["IfcProduct","IfcStructuralActivityAssignmentSelect"],"fields":{"Tag":{"type":"string","reference":false,"many":false,"inverse":false},"FillsVoids":{"type":"IfcRelFillsElement","reference":true,"many":true,"inverse":true},"ConnectedTo":{"type":"IfcRelConnectsElements","reference":true,"many":true,"inverse":true},"IsInterferedByElements":{"type":"IfcRelInterferesElements","reference":true,"many":true,"inverse":true},"InterferesElements":{"type":"IfcRelInterferesElements","reference":true,"many":true,"inverse":true},"HasProjections":{"type":"IfcRelProjectsElement","reference":true,"many":true,"inverse":true},"ReferencedInStructures":{"type":"IfcRelReferencedInSpatialStructure","reference":true,"many":true,"inverse":true},"HasOpenings":{"type":"IfcRelVoidsElement","reference":true,"many":true,"inverse":true},"IsConnectionRealization":{"type":"IfcRelConnectsWithRealizingElements","reference":true,"many":true,"inverse":true},"ProvidesBoundaries":{"type":"IfcRelSpaceBoundary","reference":true,"many":true,"inverse":true},"ConnectedFrom":{"type":"IfcRelConnectsElements","reference":true,"many":true,"inverse":true},"ContainedInStructure":{"type":"IfcRelContainedInSpatialStructure","reference":true,"many":true,"inverse":true},"HasCoverings":{"type":"IfcRelCoversBldgElements","reference":true,"many":true,"inverse":true}}},"IfcElementAssembly":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{"AssemblyPlace":{"type":"enum","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElementAssemblyType":{"domain":"ifcproductextension","superclasses":["IfcElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcElementComponent":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElement"],"fields":{}},"IfcElementComponentType":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementType"],"fields":{}},"IfcElementQuantity":{"domain":"ifcproductextension","superclasses":["IfcQuantitySet"],"fields":{"MethodOfMeasurement":{"type":"string","reference":false,"many":false,"inverse":false},"Quantities":{"type":"IfcPhysicalQuantity","reference":true,"many":true,"inverse":false}}},"IfcElementType":{"domain":"ifcproductextension","superclasses":["IfcTypeProduct"],"fields":{"ElementType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcElementarySurface":{"domain":"ifcgeometryresource","superclasses":["IfcSurface"],"fields":{"Position":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false}}},"IfcEllipse":{"domain":"ifcgeometryresource","superclasses":["IfcConic"],"fields":{"SemiAxis1":{"type":"double","reference":false,"many":false,"inverse":false},"SemiAxis1AsString":{"type":"string","reference":false,"many":false,"inverse":false},"SemiAxis2":{"type":"double","reference":false,"many":false,"inverse":false},"SemiAxis2AsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcEllipseProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"SemiAxis1":{"type":"double","reference":false,"many":false,"inverse":false},"SemiAxis1AsString":{"type":"string","reference":false,"many":false,"inverse":false},"SemiAxis2":{"type":"double","reference":false,"many":false,"inverse":false},"SemiAxis2AsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcEnergyConversionDevice":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{}},"IfcEnergyConversionDeviceType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{}},"IfcEngine":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcEngineType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcEvaporativeCooler":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcEvaporativeCoolerType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcEvaporator":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcEvaporatorType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcEvent":{"domain":"ifcprocessextension","superclasses":["IfcProcess"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"EventTriggerType":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedEventTriggerType":{"type":"string","reference":false,"many":false,"inverse":false},"EventOccurenceTime":{"type":"IfcEventTime","reference":true,"many":false,"inverse":false}}},"IfcEventTime":{"domain":"ifcdatetimeresource","superclasses":["IfcSchedulingTime"],"fields":{"ActualDate":{"type":"string","reference":false,"many":false,"inverse":false},"EarlyDate":{"type":"string","reference":false,"many":false,"inverse":false},"LateDate":{"type":"string","reference":false,"many":false,"inverse":false},"ScheduleDate":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcEventType":{"domain":"ifcprocessextension","superclasses":["IfcTypeProcess"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"EventTriggerType":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedEventTriggerType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcExtendedProperties":{"domain":"ifcpropertyresource","superclasses":["IfcPropertyAbstraction"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Properties":{"type":"IfcProperty","reference":true,"many":true,"inverse":false}}},"IfcExternalInformation":{"domain":"ifcexternalreferenceresource","superclasses":["IfcResourceObjectSelect"],"fields":{}},"IfcExternalReference":{"domain":"ifcexternalreferenceresource","superclasses":["IfcLightDistributionDataSourceSelect","IfcObjectReferenceSelect","IfcResourceObjectSelect"],"fields":{"Location":{"type":"string","reference":false,"many":false,"inverse":false},"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"ExternalReferenceForResources":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true}}},"IfcExternalReferenceRelationship":{"domain":"ifcexternalreferenceresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"RelatingReference":{"type":"IfcExternalReference","reference":true,"many":false,"inverse":true},"RelatedResourceObjects":{"type":"IfcResourceObjectSelect","reference":true,"many":true,"inverse":true}}},"IfcExternalSpatialElement":{"domain":"ifcproductextension","superclasses":["IfcExternalSpatialStructureElement","IfcSpaceBoundarySelect"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"BoundedBy":{"type":"IfcRelSpaceBoundary","reference":true,"many":true,"inverse":true}}},"IfcExternalSpatialStructureElement":{"domain":"ifcproductextension","superclasses":["IfcSpatialElement"],"fields":{}},"IfcExternallyDefinedHatchStyle":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcExternalReference","IfcFillStyleSelect"],"fields":{}},"IfcExternallyDefinedSurfaceStyle":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcExternalReference","IfcSurfaceStyleElementSelect"],"fields":{}},"IfcExternallyDefinedTextFont":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcExternalReference","IfcTextFontSelect"],"fields":{}},"IfcExtrudedAreaSolid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSweptAreaSolid"],"fields":{"ExtrudedDirection":{"type":"IfcDirection","reference":true,"many":false,"inverse":false},"Depth":{"type":"double","reference":false,"many":false,"inverse":false},"DepthAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcExtrudedAreaSolidTapered":{"domain":"ifcgeometricmodelresource","superclasses":["IfcExtrudedAreaSolid"],"fields":{"EndSweptArea":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":false}}},"IfcFace":{"domain":"ifctopologyresource","superclasses":["IfcTopologicalRepresentationItem"],"fields":{"Bounds":{"type":"IfcFaceBound","reference":true,"many":true,"inverse":false},"HasTextureMaps":{"type":"IfcTextureMap","reference":true,"many":true,"inverse":true}}},"IfcFaceBasedSurfaceModel":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem","IfcSurfaceOrFaceSurface"],"fields":{"FbsmFaces":{"type":"IfcConnectedFaceSet","reference":true,"many":true,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcFaceBound":{"domain":"ifctopologyresource","superclasses":["IfcTopologicalRepresentationItem"],"fields":{"Bound":{"type":"IfcLoop","reference":true,"many":false,"inverse":false},"Orientation":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFaceOuterBound":{"domain":"ifctopologyresource","superclasses":["IfcFaceBound"],"fields":{}},"IfcFaceSurface":{"domain":"ifctopologyresource","superclasses":["IfcFace","IfcSurfaceOrFaceSurface"],"fields":{"FaceSurface":{"type":"IfcSurface","reference":true,"many":false,"inverse":false},"SameSense":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFacetedBrep":{"domain":"ifcgeometricmodelresource","superclasses":["IfcManifoldSolidBrep"],"fields":{}},"IfcFacetedBrepWithVoids":{"domain":"ifcgeometricmodelresource","superclasses":["IfcFacetedBrep"],"fields":{"Voids":{"type":"IfcClosedShell","reference":true,"many":true,"inverse":false}}},"IfcFailureConnectionCondition":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralConnectionCondition"],"fields":{"TensionFailureX":{"type":"double","reference":false,"many":false,"inverse":false},"TensionFailureXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TensionFailureY":{"type":"double","reference":false,"many":false,"inverse":false},"TensionFailureYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TensionFailureZ":{"type":"double","reference":false,"many":false,"inverse":false},"TensionFailureZAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CompressionFailureX":{"type":"double","reference":false,"many":false,"inverse":false},"CompressionFailureXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CompressionFailureY":{"type":"double","reference":false,"many":false,"inverse":false},"CompressionFailureYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CompressionFailureZ":{"type":"double","reference":false,"many":false,"inverse":false},"CompressionFailureZAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcFan":{"domain":"ifchvacdomain","superclasses":["IfcFlowMovingDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFanType":{"domain":"ifchvacdomain","superclasses":["IfcFlowMovingDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFastener":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementComponent"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFastenerType":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementComponentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFeatureElement":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{}},"IfcFeatureElementAddition":{"domain":"ifcproductextension","superclasses":["IfcFeatureElement"],"fields":{"ProjectsElements":{"type":"IfcRelProjectsElement","reference":true,"many":false,"inverse":true}}},"IfcFeatureElementSubtraction":{"domain":"ifcproductextension","superclasses":["IfcFeatureElement"],"fields":{"VoidsElements":{"type":"IfcRelVoidsElement","reference":true,"many":false,"inverse":true}}},"IfcFillAreaStyle":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationStyle","IfcPresentationStyleSelect"],"fields":{"FillStyles":{"type":"IfcFillStyleSelect","reference":true,"many":true,"inverse":false},"ModelorDraughting":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFillAreaStyleHatching":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcGeometricRepresentationItem","IfcFillStyleSelect"],"fields":{"HatchLineAppearance":{"type":"IfcCurveStyle","reference":true,"many":false,"inverse":false},"StartOfNextHatchLine":{"type":"IfcHatchLineDistanceSelect","reference":true,"many":false,"inverse":false},"PointOfReferenceHatchLine":{"type":"IfcCartesianPoint","reference":true,"many":false,"inverse":false},"PatternStart":{"type":"IfcCartesianPoint","reference":true,"many":false,"inverse":false},"HatchLineAngle":{"type":"double","reference":false,"many":false,"inverse":false},"HatchLineAngleAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcFillAreaStyleTiles":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcGeometricRepresentationItem","IfcFillStyleSelect"],"fields":{"TilingPattern":{"type":"IfcVector","reference":true,"many":true,"inverse":false},"Tiles":{"type":"IfcStyledItem","reference":true,"many":true,"inverse":false},"TilingScale":{"type":"double","reference":false,"many":false,"inverse":false},"TilingScaleAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcFilter":{"domain":"ifchvacdomain","superclasses":["IfcFlowTreatmentDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFilterType":{"domain":"ifchvacdomain","superclasses":["IfcFlowTreatmentDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFireSuppressionTerminal":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFireSuppressionTerminalType":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFixedReferenceSweptAreaSolid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSweptAreaSolid"],"fields":{"Directrix":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"StartParam":{"type":"double","reference":false,"many":false,"inverse":false},"StartParamAsString":{"type":"string","reference":false,"many":false,"inverse":false},"EndParam":{"type":"double","reference":false,"many":false,"inverse":false},"EndParamAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FixedReference":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcFlowController":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{}},"IfcFlowControllerType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{}},"IfcFlowFitting":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{}},"IfcFlowFittingType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{}},"IfcFlowInstrument":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFlowInstrumentType":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFlowMeter":{"domain":"ifchvacdomain","superclasses":["IfcFlowController"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFlowMeterType":{"domain":"ifchvacdomain","superclasses":["IfcFlowControllerType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFlowMovingDevice":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{}},"IfcFlowMovingDeviceType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{}},"IfcFlowSegment":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{}},"IfcFlowSegmentType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{}},"IfcFlowStorageDevice":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{}},"IfcFlowStorageDeviceType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{}},"IfcFlowTerminal":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{}},"IfcFlowTerminalType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{}},"IfcFlowTreatmentDevice":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElement"],"fields":{}},"IfcFlowTreatmentDeviceType":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcDistributionFlowElementType"],"fields":{}},"IfcFooting":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFootingType":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFurnishingElement":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{}},"IfcFurnishingElementType":{"domain":"ifcproductextension","superclasses":["IfcElementType"],"fields":{}},"IfcFurniture":{"domain":"ifcsharedfacilitieselements","superclasses":["IfcFurnishingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcFurnitureType":{"domain":"ifcsharedfacilitieselements","superclasses":["IfcFurnishingElementType"],"fields":{"AssemblyPlace":{"type":"enum","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcGeographicElement":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcGeographicElementType":{"domain":"ifcproductextension","superclasses":["IfcElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcGeometricCurveSet":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricSet"],"fields":{}},"IfcGeometricRepresentationContext":{"domain":"ifcrepresentationresource","superclasses":["IfcRepresentationContext","IfcCoordinateReferenceSystemSelect"],"fields":{"CoordinateSpaceDimension":{"type":"long","reference":false,"many":false,"inverse":false},"Precision":{"type":"double","reference":false,"many":false,"inverse":false},"PrecisionAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WorldCoordinateSystem":{"type":"IfcAxis2Placement","reference":true,"many":false,"inverse":false},"TrueNorth":{"type":"IfcDirection","reference":true,"many":false,"inverse":false},"HasSubContexts":{"type":"IfcGeometricRepresentationSubContext","reference":true,"many":true,"inverse":true},"HasCoordinateOperation":{"type":"IfcCoordinateOperation","reference":true,"many":true,"inverse":true}}},"IfcGeometricRepresentationItem":{"domain":"ifcgeometryresource","superclasses":["IfcRepresentationItem"],"fields":{}},"IfcGeometricRepresentationSubContext":{"domain":"ifcrepresentationresource","superclasses":["IfcGeometricRepresentationContext"],"fields":{"ParentContext":{"type":"IfcGeometricRepresentationContext","reference":true,"many":false,"inverse":true},"TargetScale":{"type":"double","reference":false,"many":false,"inverse":false},"TargetScaleAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TargetView":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedTargetView":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcGeometricSet":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"Elements":{"type":"IfcGeometricSetSelect","reference":true,"many":true,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcGrid":{"domain":"ifcproductextension","superclasses":["IfcProduct"],"fields":{"UAxes":{"type":"IfcGridAxis","reference":true,"many":true,"inverse":true},"VAxes":{"type":"IfcGridAxis","reference":true,"many":true,"inverse":true},"WAxes":{"type":"IfcGridAxis","reference":true,"many":true,"inverse":true},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"ContainedInStructure":{"type":"IfcRelContainedInSpatialStructure","reference":true,"many":true,"inverse":true}}},"IfcGridAxis":{"domain":"ifcgeometricconstraintresource","superclasses":[],"fields":{"AxisTag":{"type":"string","reference":false,"many":false,"inverse":false},"AxisCurve":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"SameSense":{"type":"enum","reference":false,"many":false,"inverse":false},"PartOfW":{"type":"IfcGrid","reference":true,"many":true,"inverse":true},"PartOfV":{"type":"IfcGrid","reference":true,"many":true,"inverse":true},"PartOfU":{"type":"IfcGrid","reference":true,"many":true,"inverse":true},"HasIntersections":{"type":"IfcVirtualGridIntersection","reference":true,"many":true,"inverse":true}}},"IfcGridPlacement":{"domain":"ifcgeometricconstraintresource","superclasses":["IfcObjectPlacement"],"fields":{"PlacementLocation":{"type":"IfcVirtualGridIntersection","reference":true,"many":false,"inverse":false},"PlacementRefDirection":{"type":"IfcGridPlacementDirectionSelect","reference":true,"many":false,"inverse":false}}},"IfcGroup":{"domain":"ifckernel","superclasses":["IfcObject"],"fields":{"IsGroupedBy":{"type":"IfcRelAssignsToGroup","reference":true,"many":true,"inverse":true}}},"IfcHalfSpaceSolid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem","IfcBooleanOperand"],"fields":{"BaseSurface":{"type":"IfcSurface","reference":true,"many":false,"inverse":false},"AgreementFlag":{"type":"enum","reference":false,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcHeatExchanger":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcHeatExchangerType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcHumidifier":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcHumidifierType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcIShapeProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"OverallWidth":{"type":"double","reference":false,"many":false,"inverse":false},"OverallWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"OverallDepth":{"type":"double","reference":false,"many":false,"inverse":false},"OverallDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WebThickness":{"type":"double","reference":false,"many":false,"inverse":false},"WebThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeThickness":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"FilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeEdgeRadius":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeEdgeRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeSlope":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeSlopeAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcImageTexture":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcSurfaceTexture"],"fields":{"URLReference":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcIndexedColourMap":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"MappedTo":{"type":"IfcTessellatedFaceSet","reference":true,"many":false,"inverse":true},"Opacity":{"type":"double","reference":false,"many":false,"inverse":false},"OpacityAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Colours":{"type":"IfcColourRgbList","reference":true,"many":false,"inverse":false},"ColourIndex":{"type":"long","reference":false,"many":true,"inverse":false}}},"IfcIndexedPolyCurve":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedCurve"],"fields":{"Points":{"type":"IfcCartesianPointList","reference":true,"many":false,"inverse":false},"Segments":{"type":"IfcSegmentIndexSelect","reference":true,"many":true,"inverse":false},"SelfIntersect":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcIndexedPolygonalFace":{"domain":"ifcgeometricmodelresource","superclasses":["IfcTessellatedItem"],"fields":{"CoordIndex":{"type":"long","reference":false,"many":true,"inverse":false},"ToFaceSet":{"type":"IfcPolygonalFaceSet","reference":true,"many":true,"inverse":true}}},"IfcIndexedPolygonalFaceWithVoids":{"domain":"ifcgeometricmodelresource","superclasses":["IfcIndexedPolygonalFace"],"fields":{"InnerCoordIndices":{"type":"ListOfELong","reference":true,"many":true,"inverse":false}}},"IfcIndexedTextureMap":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcTextureCoordinate"],"fields":{"MappedTo":{"type":"IfcTessellatedFaceSet","reference":true,"many":false,"inverse":true},"TexCoords":{"type":"IfcTextureVertexList","reference":true,"many":false,"inverse":false}}},"IfcIndexedTriangleTextureMap":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcIndexedTextureMap"],"fields":{"TexCoordIndex":{"type":"ListOfELong","reference":true,"many":true,"inverse":false}}},"IfcInterceptor":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTreatmentDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcInterceptorType":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTreatmentDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcIntersectionCurve":{"domain":"ifcgeometryresource","superclasses":["IfcSurfaceCurve"],"fields":{}},"IfcInventory":{"domain":"ifcsharedfacilitieselements","superclasses":["IfcGroup"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"Jurisdiction":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"ResponsiblePersons":{"type":"IfcPerson","reference":true,"many":true,"inverse":false},"LastUpdateDate":{"type":"string","reference":false,"many":false,"inverse":false},"CurrentValue":{"type":"IfcCostValue","reference":true,"many":false,"inverse":false},"OriginalValue":{"type":"IfcCostValue","reference":true,"many":false,"inverse":false}}},"IfcIrregularTimeSeries":{"domain":"ifcdatetimeresource","superclasses":["IfcTimeSeries"],"fields":{"Values":{"type":"IfcIrregularTimeSeriesValue","reference":true,"many":true,"inverse":false}}},"IfcIrregularTimeSeriesValue":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{"TimeStamp":{"type":"string","reference":false,"many":false,"inverse":false},"ListValues":{"type":"IfcValue","reference":true,"many":true,"inverse":false}}},"IfcJunctionBox":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowFitting"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcJunctionBoxType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowFittingType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLShapeProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"Depth":{"type":"double","reference":false,"many":false,"inverse":false},"DepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Width":{"type":"double","reference":false,"many":false,"inverse":false},"WidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Thickness":{"type":"double","reference":false,"many":false,"inverse":false},"ThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"FilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"EdgeRadius":{"type":"double","reference":false,"many":false,"inverse":false},"EdgeRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LegSlope":{"type":"double","reference":false,"many":false,"inverse":false},"LegSlopeAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLaborResource":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResource"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLaborResourceType":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResourceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLagTime":{"domain":"ifcdatetimeresource","superclasses":["IfcSchedulingTime"],"fields":{"LagValue":{"type":"IfcTimeOrRatioSelect","reference":true,"many":false,"inverse":false},"DurationType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLamp":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLampType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLibraryInformation":{"domain":"ifcexternalreferenceresource","superclasses":["IfcExternalInformation","IfcLibrarySelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Version":{"type":"string","reference":false,"many":false,"inverse":false},"Publisher":{"type":"IfcActorSelect","reference":true,"many":false,"inverse":false},"VersionDate":{"type":"string","reference":false,"many":false,"inverse":false},"Location":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"LibraryInfoForObjects":{"type":"IfcRelAssociatesLibrary","reference":true,"many":true,"inverse":true},"HasLibraryReferences":{"type":"IfcLibraryReference","reference":true,"many":true,"inverse":true}}},"IfcLibraryReference":{"domain":"ifcexternalreferenceresource","superclasses":["IfcExternalReference","IfcLibrarySelect"],"fields":{"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Language":{"type":"string","reference":false,"many":false,"inverse":false},"ReferencedLibrary":{"type":"IfcLibraryInformation","reference":true,"many":false,"inverse":true},"LibraryRefForObjects":{"type":"IfcRelAssociatesLibrary","reference":true,"many":true,"inverse":true}}},"IfcLightDistributionData":{"domain":"ifcpresentationorganizationresource","superclasses":[],"fields":{"MainPlaneAngle":{"type":"double","reference":false,"many":false,"inverse":false},"MainPlaneAngleAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SecondaryPlaneAngle":{"type":"double","reference":false,"many":true,"inverse":false},"SecondaryPlaneAngleAsString":{"type":"string","reference":false,"many":true,"inverse":false},"LuminousIntensity":{"type":"double","reference":false,"many":true,"inverse":false},"LuminousIntensityAsString":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcLightFixture":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLightFixtureType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLightIntensityDistribution":{"domain":"ifcpresentationorganizationresource","superclasses":["IfcLightDistributionDataSourceSelect"],"fields":{"LightDistributionCurve":{"type":"enum","reference":false,"many":false,"inverse":false},"DistributionData":{"type":"IfcLightDistributionData","reference":true,"many":true,"inverse":false}}},"IfcLightSource":{"domain":"ifcpresentationorganizationresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"LightColour":{"type":"IfcColourRgb","reference":true,"many":false,"inverse":false},"AmbientIntensity":{"type":"double","reference":false,"many":false,"inverse":false},"AmbientIntensityAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Intensity":{"type":"double","reference":false,"many":false,"inverse":false},"IntensityAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLightSourceAmbient":{"domain":"ifcpresentationorganizationresource","superclasses":["IfcLightSource"],"fields":{}},"IfcLightSourceDirectional":{"domain":"ifcpresentationorganizationresource","superclasses":["IfcLightSource"],"fields":{"Orientation":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcLightSourceGoniometric":{"domain":"ifcpresentationorganizationresource","superclasses":["IfcLightSource"],"fields":{"Position":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false},"ColourAppearance":{"type":"IfcColourRgb","reference":true,"many":false,"inverse":false},"ColourTemperature":{"type":"double","reference":false,"many":false,"inverse":false},"ColourTemperatureAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LuminousFlux":{"type":"double","reference":false,"many":false,"inverse":false},"LuminousFluxAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LightEmissionSource":{"type":"enum","reference":false,"many":false,"inverse":false},"LightDistributionDataSource":{"type":"IfcLightDistributionDataSourceSelect","reference":true,"many":false,"inverse":false}}},"IfcLightSourcePositional":{"domain":"ifcpresentationorganizationresource","superclasses":["IfcLightSource"],"fields":{"Position":{"type":"IfcCartesianPoint","reference":true,"many":false,"inverse":false},"Radius":{"type":"double","reference":false,"many":false,"inverse":false},"RadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ConstantAttenuation":{"type":"double","reference":false,"many":false,"inverse":false},"ConstantAttenuationAsString":{"type":"string","reference":false,"many":false,"inverse":false},"DistanceAttenuation":{"type":"double","reference":false,"many":false,"inverse":false},"DistanceAttenuationAsString":{"type":"string","reference":false,"many":false,"inverse":false},"QuadricAttenuation":{"type":"double","reference":false,"many":false,"inverse":false},"QuadricAttenuationAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLightSourceSpot":{"domain":"ifcpresentationorganizationresource","superclasses":["IfcLightSourcePositional"],"fields":{"Orientation":{"type":"IfcDirection","reference":true,"many":false,"inverse":false},"ConcentrationExponent":{"type":"double","reference":false,"many":false,"inverse":false},"ConcentrationExponentAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SpreadAngle":{"type":"double","reference":false,"many":false,"inverse":false},"SpreadAngleAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BeamWidthAngle":{"type":"double","reference":false,"many":false,"inverse":false},"BeamWidthAngleAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLine":{"domain":"ifcgeometryresource","superclasses":["IfcCurve"],"fields":{"Pnt":{"type":"IfcCartesianPoint","reference":true,"many":false,"inverse":false},"Dir":{"type":"IfcVector","reference":true,"many":false,"inverse":false}}},"IfcLocalPlacement":{"domain":"ifcgeometricconstraintresource","superclasses":["IfcObjectPlacement"],"fields":{"PlacementRelTo":{"type":"IfcObjectPlacement","reference":true,"many":false,"inverse":true},"RelativePlacement":{"type":"IfcAxis2Placement","reference":true,"many":false,"inverse":false}}},"IfcLoop":{"domain":"ifctopologyresource","superclasses":["IfcTopologicalRepresentationItem"],"fields":{}},"IfcManifoldSolidBrep":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSolidModel"],"fields":{"Outer":{"type":"IfcClosedShell","reference":true,"many":false,"inverse":false}}},"IfcMapConversion":{"domain":"ifcrepresentationresource","superclasses":["IfcCoordinateOperation"],"fields":{"Eastings":{"type":"double","reference":false,"many":false,"inverse":false},"EastingsAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Northings":{"type":"double","reference":false,"many":false,"inverse":false},"NorthingsAsString":{"type":"string","reference":false,"many":false,"inverse":false},"OrthogonalHeight":{"type":"double","reference":false,"many":false,"inverse":false},"OrthogonalHeightAsString":{"type":"string","reference":false,"many":false,"inverse":false},"XAxisAbscissa":{"type":"double","reference":false,"many":false,"inverse":false},"XAxisAbscissaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"XAxisOrdinate":{"type":"double","reference":false,"many":false,"inverse":false},"XAxisOrdinateAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Scale":{"type":"double","reference":false,"many":false,"inverse":false},"ScaleAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMappedItem":{"domain":"ifcgeometryresource","superclasses":["IfcRepresentationItem"],"fields":{"MappingSource":{"type":"IfcRepresentationMap","reference":true,"many":false,"inverse":true},"MappingTarget":{"type":"IfcCartesianTransformationOperator","reference":true,"many":false,"inverse":false}}},"IfcMaterial":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialDefinition"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Category":{"type":"string","reference":false,"many":false,"inverse":false},"HasRepresentation":{"type":"IfcMaterialDefinitionRepresentation","reference":true,"many":true,"inverse":true},"IsRelatedWith":{"type":"IfcMaterialRelationship","reference":true,"many":true,"inverse":true},"RelatesTo":{"type":"IfcMaterialRelationship","reference":true,"many":true,"inverse":true}}},"IfcMaterialClassificationRelationship":{"domain":"ifcmaterialresource","superclasses":[],"fields":{"MaterialClassifications":{"type":"IfcClassificationSelect","reference":true,"many":true,"inverse":false},"ClassifiedMaterial":{"type":"IfcMaterial","reference":true,"many":false,"inverse":false}}},"IfcMaterialConstituent":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialDefinition"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Material":{"type":"IfcMaterial","reference":true,"many":false,"inverse":false},"Fraction":{"type":"double","reference":false,"many":false,"inverse":false},"FractionAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Category":{"type":"string","reference":false,"many":false,"inverse":false},"ToMaterialConstituentSet":{"type":"IfcMaterialConstituentSet","reference":true,"many":false,"inverse":true}}},"IfcMaterialConstituentSet":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialDefinition"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"MaterialConstituents":{"type":"IfcMaterialConstituent","reference":true,"many":true,"inverse":true}}},"IfcMaterialDefinition":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialSelect","IfcObjectReferenceSelect","IfcResourceObjectSelect"],"fields":{"AssociatedTo":{"type":"IfcRelAssociatesMaterial","reference":true,"many":true,"inverse":true},"HasExternalReferences":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true},"HasProperties":{"type":"IfcMaterialProperties","reference":true,"many":true,"inverse":true}}},"IfcMaterialDefinitionRepresentation":{"domain":"ifcrepresentationresource","superclasses":["IfcProductRepresentation"],"fields":{"RepresentedMaterial":{"type":"IfcMaterial","reference":true,"many":false,"inverse":true}}},"IfcMaterialLayer":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialDefinition"],"fields":{"Material":{"type":"IfcMaterial","reference":true,"many":false,"inverse":false},"LayerThickness":{"type":"double","reference":false,"many":false,"inverse":false},"LayerThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"IsVentilated":{"type":"enum","reference":false,"many":false,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Category":{"type":"string","reference":false,"many":false,"inverse":false},"Priority":{"type":"long","reference":false,"many":false,"inverse":false},"ToMaterialLayerSet":{"type":"IfcMaterialLayerSet","reference":true,"many":false,"inverse":true}}},"IfcMaterialLayerSet":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialDefinition"],"fields":{"MaterialLayers":{"type":"IfcMaterialLayer","reference":true,"many":true,"inverse":true},"LayerSetName":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"TotalThickness":{"type":"double","reference":false,"many":false,"inverse":false},"TotalThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMaterialLayerSetUsage":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialUsageDefinition"],"fields":{"ForLayerSet":{"type":"IfcMaterialLayerSet","reference":true,"many":false,"inverse":false},"LayerSetDirection":{"type":"enum","reference":false,"many":false,"inverse":false},"DirectionSense":{"type":"enum","reference":false,"many":false,"inverse":false},"OffsetFromReferenceLine":{"type":"double","reference":false,"many":false,"inverse":false},"OffsetFromReferenceLineAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ReferenceExtent":{"type":"double","reference":false,"many":false,"inverse":false},"ReferenceExtentAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMaterialLayerWithOffsets":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialLayer"],"fields":{"OffsetDirection":{"type":"enum","reference":false,"many":false,"inverse":false},"OffsetValues":{"type":"double","reference":false,"many":true,"inverse":false},"OffsetValuesAsString":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcMaterialList":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialSelect"],"fields":{"Materials":{"type":"IfcMaterial","reference":true,"many":true,"inverse":false}}},"IfcMaterialProfile":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialDefinition"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Material":{"type":"IfcMaterial","reference":true,"many":false,"inverse":false},"Profile":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":false},"Priority":{"type":"long","reference":false,"many":false,"inverse":false},"Category":{"type":"string","reference":false,"many":false,"inverse":false},"ToMaterialProfileSet":{"type":"IfcMaterialProfileSet","reference":true,"many":false,"inverse":true}}},"IfcMaterialProfileSet":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialDefinition"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"MaterialProfiles":{"type":"IfcMaterialProfile","reference":true,"many":true,"inverse":true},"CompositeProfile":{"type":"IfcCompositeProfileDef","reference":true,"many":false,"inverse":false}}},"IfcMaterialProfileSetUsage":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialUsageDefinition"],"fields":{"ForProfileSet":{"type":"IfcMaterialProfileSet","reference":true,"many":false,"inverse":false},"CardinalPoint":{"type":"long","reference":false,"many":false,"inverse":false},"ReferenceExtent":{"type":"double","reference":false,"many":false,"inverse":false},"ReferenceExtentAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMaterialProfileSetUsageTapering":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialProfileSetUsage"],"fields":{"ForProfileEndSet":{"type":"IfcMaterialProfileSet","reference":true,"many":false,"inverse":false},"CardinalEndPoint":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcMaterialProfileWithOffsets":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialProfile"],"fields":{"OffsetValues":{"type":"double","reference":false,"many":true,"inverse":false},"OffsetValuesAsString":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcMaterialProperties":{"domain":"ifcmaterialresource","superclasses":["IfcExtendedProperties"],"fields":{"Material":{"type":"IfcMaterialDefinition","reference":true,"many":false,"inverse":true}}},"IfcMaterialRelationship":{"domain":"ifcmaterialresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"RelatingMaterial":{"type":"IfcMaterial","reference":true,"many":false,"inverse":true},"RelatedMaterials":{"type":"IfcMaterial","reference":true,"many":true,"inverse":true},"Expression":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMaterialUsageDefinition":{"domain":"ifcmaterialresource","superclasses":["IfcMaterialSelect"],"fields":{"AssociatedTo":{"type":"IfcRelAssociatesMaterial","reference":true,"many":true,"inverse":true}}},"IfcMeasureWithUnit":{"domain":"ifcmeasureresource","superclasses":["IfcAppliedValueSelect","IfcMetricValueSelect"],"fields":{"ValueComponent":{"type":"IfcValue","reference":true,"many":false,"inverse":false},"UnitComponent":{"type":"IfcUnit","reference":true,"many":false,"inverse":false}}},"IfcMechanicalFastener":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementComponent"],"fields":{"NominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"NominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"NominalLength":{"type":"double","reference":false,"many":false,"inverse":false},"NominalLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcMechanicalFastenerType":{"domain":"ifcsharedcomponentelements","superclasses":["IfcElementComponentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"NominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"NominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"NominalLength":{"type":"double","reference":false,"many":false,"inverse":false},"NominalLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMedicalDevice":{"domain":"ifchvacdomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcMedicalDeviceType":{"domain":"ifchvacdomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcMember":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcMemberStandardCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcMember"],"fields":{}},"IfcMemberType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcMetric":{"domain":"ifcconstraintresource","superclasses":["IfcConstraint"],"fields":{"Benchmark":{"type":"enum","reference":false,"many":false,"inverse":false},"ValueSource":{"type":"string","reference":false,"many":false,"inverse":false},"DataValue":{"type":"IfcMetricValueSelect","reference":true,"many":false,"inverse":false},"ReferencePath":{"type":"IfcReference","reference":true,"many":false,"inverse":false}}},"IfcMirroredProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcDerivedProfileDef"],"fields":{}},"IfcMonetaryUnit":{"domain":"ifcmeasureresource","superclasses":["IfcUnit"],"fields":{"Currency":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMotorConnection":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcMotorConnectionType":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcNamedUnit":{"domain":"ifcmeasureresource","superclasses":["IfcUnit"],"fields":{"Dimensions":{"type":"IfcDimensionalExponents","reference":true,"many":false,"inverse":false},"UnitType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcObject":{"domain":"ifckernel","superclasses":["IfcObjectDefinition"],"fields":{"ObjectType":{"type":"string","reference":false,"many":false,"inverse":false},"IsDeclaredBy":{"type":"IfcRelDefinesByObject","reference":true,"many":true,"inverse":true},"Declares":{"type":"IfcRelDefinesByObject","reference":true,"many":true,"inverse":true},"IsTypedBy":{"type":"IfcRelDefinesByType","reference":true,"many":true,"inverse":true},"IsDefinedBy":{"type":"IfcRelDefinesByProperties","reference":true,"many":true,"inverse":true}}},"IfcObjectDefinition":{"domain":"ifckernel","superclasses":["IfcRoot","IfcDefinitionSelect"],"fields":{"HasAssignments":{"type":"IfcRelAssigns","reference":true,"many":true,"inverse":true},"Nests":{"type":"IfcRelNests","reference":true,"many":true,"inverse":true},"IsNestedBy":{"type":"IfcRelNests","reference":true,"many":true,"inverse":true},"HasContext":{"type":"IfcRelDeclares","reference":true,"many":true,"inverse":true},"IsDecomposedBy":{"type":"IfcRelAggregates","reference":true,"many":true,"inverse":true},"Decomposes":{"type":"IfcRelAggregates","reference":true,"many":true,"inverse":true},"HasAssociations":{"type":"IfcRelAssociates","reference":true,"many":true,"inverse":true}}},"IfcObjectPlacement":{"domain":"ifcgeometricconstraintresource","superclasses":[],"fields":{"PlacesObject":{"type":"IfcProduct","reference":true,"many":true,"inverse":true},"ReferencedByPlacements":{"type":"IfcLocalPlacement","reference":true,"many":true,"inverse":true}}},"IfcObjective":{"domain":"ifcconstraintresource","superclasses":["IfcConstraint"],"fields":{"BenchmarkValues":{"type":"IfcConstraint","reference":true,"many":true,"inverse":false},"LogicalAggregator":{"type":"enum","reference":false,"many":false,"inverse":false},"ObjectiveQualifier":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedQualifier":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcOccupant":{"domain":"ifcsharedfacilitieselements","superclasses":["IfcActor"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcOffsetCurve2D":{"domain":"ifcgeometryresource","superclasses":["IfcCurve"],"fields":{"BasisCurve":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"Distance":{"type":"double","reference":false,"many":false,"inverse":false},"DistanceAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SelfIntersect":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcOffsetCurve3D":{"domain":"ifcgeometryresource","superclasses":["IfcCurve"],"fields":{"BasisCurve":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"Distance":{"type":"double","reference":false,"many":false,"inverse":false},"DistanceAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SelfIntersect":{"type":"enum","reference":false,"many":false,"inverse":false},"RefDirection":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcOpenShell":{"domain":"ifctopologyresource","superclasses":["IfcConnectedFaceSet","IfcShell"],"fields":{}},"IfcOpeningElement":{"domain":"ifcproductextension","superclasses":["IfcFeatureElementSubtraction"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"HasFillings":{"type":"IfcRelFillsElement","reference":true,"many":true,"inverse":true}}},"IfcOpeningStandardCase":{"domain":"ifcproductextension","superclasses":["IfcOpeningElement"],"fields":{}},"IfcOrganization":{"domain":"ifcactorresource","superclasses":["IfcActorSelect","IfcObjectReferenceSelect","IfcResourceObjectSelect"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Roles":{"type":"IfcActorRole","reference":true,"many":true,"inverse":false},"Addresses":{"type":"IfcAddress","reference":true,"many":true,"inverse":true},"IsRelatedBy":{"type":"IfcOrganizationRelationship","reference":true,"many":true,"inverse":true},"Relates":{"type":"IfcOrganizationRelationship","reference":true,"many":true,"inverse":true},"Engages":{"type":"IfcPersonAndOrganization","reference":true,"many":true,"inverse":true}}},"IfcOrganizationRelationship":{"domain":"ifcactorresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"RelatingOrganization":{"type":"IfcOrganization","reference":true,"many":false,"inverse":true},"RelatedOrganizations":{"type":"IfcOrganization","reference":true,"many":true,"inverse":true}}},"IfcOrientedEdge":{"domain":"ifctopologyresource","superclasses":["IfcEdge"],"fields":{"EdgeElement":{"type":"IfcEdge","reference":true,"many":false,"inverse":false},"Orientation":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcOuterBoundaryCurve":{"domain":"ifcgeometryresource","superclasses":["IfcBoundaryCurve"],"fields":{}},"IfcOutlet":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcOutletType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcOwnerHistory":{"domain":"ifcutilityresource","superclasses":[],"fields":{"OwningUser":{"type":"IfcPersonAndOrganization","reference":true,"many":false,"inverse":false},"OwningApplication":{"type":"IfcApplication","reference":true,"many":false,"inverse":false},"State":{"type":"enum","reference":false,"many":false,"inverse":false},"ChangeAction":{"type":"enum","reference":false,"many":false,"inverse":false},"LastModifiedDate":{"type":"long","reference":false,"many":false,"inverse":false},"LastModifyingUser":{"type":"IfcPersonAndOrganization","reference":true,"many":false,"inverse":false},"LastModifyingApplication":{"type":"IfcApplication","reference":true,"many":false,"inverse":false},"CreationDate":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcParameterizedProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcProfileDef"],"fields":{"Position":{"type":"IfcAxis2Placement2D","reference":true,"many":false,"inverse":false}}},"IfcPath":{"domain":"ifctopologyresource","superclasses":["IfcTopologicalRepresentationItem"],"fields":{"EdgeList":{"type":"IfcOrientedEdge","reference":true,"many":true,"inverse":false}}},"IfcPcurve":{"domain":"ifcgeometryresource","superclasses":["IfcCurve","IfcCurveOnSurface"],"fields":{"BasisSurface":{"type":"IfcSurface","reference":true,"many":false,"inverse":false},"ReferenceCurve":{"type":"IfcCurve","reference":true,"many":false,"inverse":false}}},"IfcPerformanceHistory":{"domain":"ifccontrolextension","superclasses":["IfcControl"],"fields":{"LifeCyclePhase":{"type":"string","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPermeableCoveringProperties":{"domain":"ifcarchitecturedomain","superclasses":["IfcPreDefinedPropertySet"],"fields":{"OperationType":{"type":"enum","reference":false,"many":false,"inverse":false},"PanelPosition":{"type":"enum","reference":false,"many":false,"inverse":false},"FrameDepth":{"type":"double","reference":false,"many":false,"inverse":false},"FrameDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FrameThickness":{"type":"double","reference":false,"many":false,"inverse":false},"FrameThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ShapeAspectStyle":{"type":"IfcShapeAspect","reference":true,"many":false,"inverse":false}}},"IfcPermit":{"domain":"ifcsharedmgmtelements","superclasses":["IfcControl"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"Status":{"type":"string","reference":false,"many":false,"inverse":false},"LongDescription":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPerson":{"domain":"ifcactorresource","superclasses":["IfcActorSelect","IfcObjectReferenceSelect","IfcResourceObjectSelect"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"FamilyName":{"type":"string","reference":false,"many":false,"inverse":false},"GivenName":{"type":"string","reference":false,"many":false,"inverse":false},"MiddleNames":{"type":"string","reference":false,"many":true,"inverse":false},"PrefixTitles":{"type":"string","reference":false,"many":true,"inverse":false},"SuffixTitles":{"type":"string","reference":false,"many":true,"inverse":false},"Roles":{"type":"IfcActorRole","reference":true,"many":true,"inverse":false},"Addresses":{"type":"IfcAddress","reference":true,"many":true,"inverse":true},"EngagedIn":{"type":"IfcPersonAndOrganization","reference":true,"many":true,"inverse":true}}},"IfcPersonAndOrganization":{"domain":"ifcactorresource","superclasses":["IfcActorSelect","IfcObjectReferenceSelect","IfcResourceObjectSelect"],"fields":{"ThePerson":{"type":"IfcPerson","reference":true,"many":false,"inverse":true},"TheOrganization":{"type":"IfcOrganization","reference":true,"many":false,"inverse":true},"Roles":{"type":"IfcActorRole","reference":true,"many":true,"inverse":false}}},"IfcPhysicalComplexQuantity":{"domain":"ifcquantityresource","superclasses":["IfcPhysicalQuantity"],"fields":{"HasQuantities":{"type":"IfcPhysicalQuantity","reference":true,"many":true,"inverse":true},"Discrimination":{"type":"string","reference":false,"many":false,"inverse":false},"Quality":{"type":"string","reference":false,"many":false,"inverse":false},"Usage":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPhysicalQuantity":{"domain":"ifcquantityresource","superclasses":["IfcResourceObjectSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"HasExternalReferences":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true},"PartOfComplex":{"type":"IfcPhysicalComplexQuantity","reference":true,"many":true,"inverse":true}}},"IfcPhysicalSimpleQuantity":{"domain":"ifcquantityresource","superclasses":["IfcPhysicalQuantity"],"fields":{"Unit":{"type":"IfcNamedUnit","reference":true,"many":false,"inverse":false}}},"IfcPile":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"ConstructionType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPileType":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPipeFitting":{"domain":"ifchvacdomain","superclasses":["IfcFlowFitting"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPipeFittingType":{"domain":"ifchvacdomain","superclasses":["IfcFlowFittingType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPipeSegment":{"domain":"ifchvacdomain","superclasses":["IfcFlowSegment"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPipeSegmentType":{"domain":"ifchvacdomain","superclasses":["IfcFlowSegmentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPixelTexture":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcSurfaceTexture"],"fields":{"Width":{"type":"long","reference":false,"many":false,"inverse":false},"Height":{"type":"long","reference":false,"many":false,"inverse":false},"ColourComponents":{"type":"long","reference":false,"many":false,"inverse":false},"Pixel":{"type":"bytearray","reference":false,"many":true,"inverse":false}}},"IfcPlacement":{"domain":"ifcgeometryresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"Location":{"type":"IfcCartesianPoint","reference":true,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcPlanarBox":{"domain":"ifcpresentationdefinitionresource","superclasses":["IfcPlanarExtent"],"fields":{"Placement":{"type":"IfcAxis2Placement","reference":true,"many":false,"inverse":false}}},"IfcPlanarExtent":{"domain":"ifcpresentationdefinitionresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"SizeInX":{"type":"double","reference":false,"many":false,"inverse":false},"SizeInXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SizeInY":{"type":"double","reference":false,"many":false,"inverse":false},"SizeInYAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPlane":{"domain":"ifcgeometryresource","superclasses":["IfcElementarySurface"],"fields":{}},"IfcPlate":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPlateStandardCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcPlate"],"fields":{}},"IfcPlateType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPoint":{"domain":"ifcgeometryresource","superclasses":["IfcGeometricRepresentationItem","IfcGeometricSetSelect","IfcPointOrVertexPoint"],"fields":{}},"IfcPointOnCurve":{"domain":"ifcgeometryresource","superclasses":["IfcPoint"],"fields":{"BasisCurve":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"PointParameter":{"type":"double","reference":false,"many":false,"inverse":false},"PointParameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcPointOnSurface":{"domain":"ifcgeometryresource","superclasses":["IfcPoint"],"fields":{"BasisSurface":{"type":"IfcSurface","reference":true,"many":false,"inverse":false},"PointParameterU":{"type":"double","reference":false,"many":false,"inverse":false},"PointParameterUAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PointParameterV":{"type":"double","reference":false,"many":false,"inverse":false},"PointParameterVAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcPolyLoop":{"domain":"ifctopologyresource","superclasses":["IfcLoop"],"fields":{"Polygon":{"type":"IfcCartesianPoint","reference":true,"many":true,"inverse":false}}},"IfcPolygonalBoundedHalfSpace":{"domain":"ifcgeometricmodelresource","superclasses":["IfcHalfSpaceSolid"],"fields":{"Position":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false},"PolygonalBoundary":{"type":"IfcBoundedCurve","reference":true,"many":false,"inverse":false}}},"IfcPolygonalFaceSet":{"domain":"ifcgeometricmodelresource","superclasses":["IfcTessellatedFaceSet"],"fields":{"Closed":{"type":"enum","reference":false,"many":false,"inverse":false},"Faces":{"type":"IfcIndexedPolygonalFace","reference":true,"many":true,"inverse":true},"PnIndex":{"type":"long","reference":false,"many":true,"inverse":false}}},"IfcPolyline":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedCurve"],"fields":{"Points":{"type":"IfcCartesianPoint","reference":true,"many":true,"inverse":false}}},"IfcPort":{"domain":"ifcproductextension","superclasses":["IfcProduct"],"fields":{"ContainedIn":{"type":"IfcRelConnectsPortToElement","reference":true,"many":true,"inverse":true},"ConnectedFrom":{"type":"IfcRelConnectsPorts","reference":true,"many":true,"inverse":true},"ConnectedTo":{"type":"IfcRelConnectsPorts","reference":true,"many":true,"inverse":true}}},"IfcPostalAddress":{"domain":"ifcactorresource","superclasses":["IfcAddress"],"fields":{"InternalLocation":{"type":"string","reference":false,"many":false,"inverse":false},"AddressLines":{"type":"string","reference":false,"many":true,"inverse":false},"PostalBox":{"type":"string","reference":false,"many":false,"inverse":false},"Town":{"type":"string","reference":false,"many":false,"inverse":false},"Region":{"type":"string","reference":false,"many":false,"inverse":false},"PostalCode":{"type":"string","reference":false,"many":false,"inverse":false},"Country":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPreDefinedColour":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPreDefinedItem","IfcColour"],"fields":{}},"IfcPreDefinedCurveFont":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPreDefinedItem","IfcCurveStyleFontSelect"],"fields":{}},"IfcPreDefinedItem":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPreDefinedProperties":{"domain":"ifcpropertyresource","superclasses":["IfcPropertyAbstraction"],"fields":{}},"IfcPreDefinedPropertySet":{"domain":"ifckernel","superclasses":["IfcPropertySetDefinition"],"fields":{}},"IfcPreDefinedTextFont":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPreDefinedItem","IfcTextFontSelect"],"fields":{}},"IfcPresentationItem":{"domain":"ifcpresentationdefinitionresource","superclasses":[],"fields":{}},"IfcPresentationLayerAssignment":{"domain":"ifcpresentationorganizationresource","superclasses":[],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"AssignedItems":{"type":"IfcLayeredItem","reference":true,"many":true,"inverse":true},"Identifier":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPresentationLayerWithStyle":{"domain":"ifcpresentationorganizationresource","superclasses":["IfcPresentationLayerAssignment"],"fields":{"LayerOn":{"type":"enum","reference":false,"many":false,"inverse":false},"LayerFrozen":{"type":"enum","reference":false,"many":false,"inverse":false},"LayerBlocked":{"type":"enum","reference":false,"many":false,"inverse":false},"LayerStyles":{"type":"IfcPresentationStyle","reference":true,"many":true,"inverse":false}}},"IfcPresentationStyle":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcStyleAssignmentSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPresentationStyleAssignment":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcStyleAssignmentSelect"],"fields":{"Styles":{"type":"IfcPresentationStyleSelect","reference":true,"many":true,"inverse":false}}},"IfcProcedure":{"domain":"ifcprocessextension","superclasses":["IfcProcess"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcProcedureType":{"domain":"ifcprocessextension","superclasses":["IfcTypeProcess"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcProcess":{"domain":"ifckernel","superclasses":["IfcObject","IfcProcessSelect"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"LongDescription":{"type":"string","reference":false,"many":false,"inverse":false},"IsPredecessorTo":{"type":"IfcRelSequence","reference":true,"many":true,"inverse":true},"IsSuccessorFrom":{"type":"IfcRelSequence","reference":true,"many":true,"inverse":true},"OperatesOn":{"type":"IfcRelAssignsToProcess","reference":true,"many":true,"inverse":true}}},"IfcProduct":{"domain":"ifckernel","superclasses":["IfcObject","IfcProductSelect"],"fields":{"ObjectPlacement":{"type":"IfcObjectPlacement","reference":true,"many":false,"inverse":true},"Representation":{"type":"IfcProductRepresentation","reference":true,"many":false,"inverse":true},"ReferencedBy":{"type":"IfcRelAssignsToProduct","reference":true,"many":true,"inverse":true},"geometry":{"type":"GeometryInfo","reference":true,"many":false,"inverse":false}}},"IfcProductDefinitionShape":{"domain":"ifcrepresentationresource","superclasses":["IfcProductRepresentation","IfcProductRepresentationSelect"],"fields":{"ShapeOfProduct":{"type":"IfcProduct","reference":true,"many":true,"inverse":true},"HasShapeAspects":{"type":"IfcShapeAspect","reference":true,"many":true,"inverse":true}}},"IfcProductRepresentation":{"domain":"ifcrepresentationresource","superclasses":[],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Representations":{"type":"IfcRepresentation","reference":true,"many":true,"inverse":true}}},"IfcProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcResourceObjectSelect"],"fields":{"ProfileType":{"type":"enum","reference":false,"many":false,"inverse":false},"ProfileName":{"type":"string","reference":false,"many":false,"inverse":false},"HasExternalReference":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true},"HasProperties":{"type":"IfcProfileProperties","reference":true,"many":true,"inverse":true}}},"IfcProfileProperties":{"domain":"ifcprofileresource","superclasses":["IfcExtendedProperties"],"fields":{"ProfileDefinition":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":true}}},"IfcProject":{"domain":"ifckernel","superclasses":["IfcContext"],"fields":{}},"IfcProjectLibrary":{"domain":"ifckernel","superclasses":["IfcContext"],"fields":{}},"IfcProjectOrder":{"domain":"ifcsharedmgmtelements","superclasses":["IfcControl"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"Status":{"type":"string","reference":false,"many":false,"inverse":false},"LongDescription":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcProjectedCRS":{"domain":"ifcrepresentationresource","superclasses":["IfcCoordinateReferenceSystem"],"fields":{"MapProjection":{"type":"string","reference":false,"many":false,"inverse":false},"MapZone":{"type":"string","reference":false,"many":false,"inverse":false},"MapUnit":{"type":"IfcNamedUnit","reference":true,"many":false,"inverse":false}}},"IfcProjectionElement":{"domain":"ifcproductextension","superclasses":["IfcFeatureElementAddition"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcProperty":{"domain":"ifcpropertyresource","superclasses":["IfcPropertyAbstraction"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"PartOfPset":{"type":"IfcPropertySet","reference":true,"many":true,"inverse":true},"PropertyForDependance":{"type":"IfcPropertyDependencyRelationship","reference":true,"many":true,"inverse":true},"PropertyDependsOn":{"type":"IfcPropertyDependencyRelationship","reference":true,"many":true,"inverse":true},"PartOfComplex":{"type":"IfcComplexProperty","reference":true,"many":true,"inverse":true},"HasConstraints":{"type":"IfcResourceConstraintRelationship","reference":true,"many":true,"inverse":true},"HasApprovals":{"type":"IfcResourceApprovalRelationship","reference":true,"many":true,"inverse":true}}},"IfcPropertyAbstraction":{"domain":"ifcpropertyresource","superclasses":["IfcResourceObjectSelect"],"fields":{"HasExternalReferences":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true}}},"IfcPropertyBoundedValue":{"domain":"ifcpropertyresource","superclasses":["IfcSimpleProperty"],"fields":{"UpperBoundValue":{"type":"IfcValue","reference":true,"many":false,"inverse":false},"LowerBoundValue":{"type":"IfcValue","reference":true,"many":false,"inverse":false},"Unit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false},"SetPointValue":{"type":"IfcValue","reference":true,"many":false,"inverse":false}}},"IfcPropertyDefinition":{"domain":"ifckernel","superclasses":["IfcRoot","IfcDefinitionSelect"],"fields":{"HasContext":{"type":"IfcRelDeclares","reference":true,"many":true,"inverse":true},"HasAssociations":{"type":"IfcRelAssociates","reference":true,"many":true,"inverse":true}}},"IfcPropertyDependencyRelationship":{"domain":"ifcpropertyresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"DependingProperty":{"type":"IfcProperty","reference":true,"many":false,"inverse":true},"DependantProperty":{"type":"IfcProperty","reference":true,"many":false,"inverse":true},"Expression":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPropertyEnumeratedValue":{"domain":"ifcpropertyresource","superclasses":["IfcSimpleProperty"],"fields":{"EnumerationValues":{"type":"IfcValue","reference":true,"many":true,"inverse":false},"EnumerationReference":{"type":"IfcPropertyEnumeration","reference":true,"many":false,"inverse":false}}},"IfcPropertyEnumeration":{"domain":"ifcpropertyresource","superclasses":["IfcPropertyAbstraction"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"EnumerationValues":{"type":"IfcValue","reference":true,"many":true,"inverse":false},"Unit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false}}},"IfcPropertyListValue":{"domain":"ifcpropertyresource","superclasses":["IfcSimpleProperty"],"fields":{"ListValues":{"type":"IfcValue","reference":true,"many":true,"inverse":false},"Unit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false}}},"IfcPropertyReferenceValue":{"domain":"ifcpropertyresource","superclasses":["IfcSimpleProperty"],"fields":{"UsageName":{"type":"string","reference":false,"many":false,"inverse":false},"PropertyReference":{"type":"IfcObjectReferenceSelect","reference":true,"many":false,"inverse":false}}},"IfcPropertySet":{"domain":"ifckernel","superclasses":["IfcPropertySetDefinition"],"fields":{"HasProperties":{"type":"IfcProperty","reference":true,"many":true,"inverse":true}}},"IfcPropertySetDefinition":{"domain":"ifckernel","superclasses":["IfcPropertyDefinition","IfcPropertySetDefinitionSelect"],"fields":{"DefinesType":{"type":"IfcTypeObject","reference":true,"many":true,"inverse":true},"IsDefinedBy":{"type":"IfcRelDefinesByTemplate","reference":true,"many":true,"inverse":true},"DefinesOccurrence":{"type":"IfcRelDefinesByProperties","reference":true,"many":true,"inverse":true}}},"IfcPropertySetTemplate":{"domain":"ifckernel","superclasses":["IfcPropertyTemplateDefinition"],"fields":{"TemplateType":{"type":"enum","reference":false,"many":false,"inverse":false},"ApplicableEntity":{"type":"string","reference":false,"many":false,"inverse":false},"HasPropertyTemplates":{"type":"IfcPropertyTemplate","reference":true,"many":true,"inverse":true},"Defines":{"type":"IfcRelDefinesByTemplate","reference":true,"many":true,"inverse":true}}},"IfcPropertySingleValue":{"domain":"ifcpropertyresource","superclasses":["IfcSimpleProperty"],"fields":{"NominalValue":{"type":"IfcValue","reference":true,"many":false,"inverse":false},"Unit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false}}},"IfcPropertyTableValue":{"domain":"ifcpropertyresource","superclasses":["IfcSimpleProperty"],"fields":{"DefiningValues":{"type":"IfcValue","reference":true,"many":true,"inverse":false},"DefinedValues":{"type":"IfcValue","reference":true,"many":true,"inverse":false},"Expression":{"type":"string","reference":false,"many":false,"inverse":false},"DefiningUnit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false},"DefinedUnit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false},"CurveInterpolation":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPropertyTemplate":{"domain":"ifckernel","superclasses":["IfcPropertyTemplateDefinition"],"fields":{"PartOfComplexTemplate":{"type":"IfcComplexPropertyTemplate","reference":true,"many":true,"inverse":true},"PartOfPsetTemplate":{"type":"IfcPropertySetTemplate","reference":true,"many":true,"inverse":true}}},"IfcPropertyTemplateDefinition":{"domain":"ifckernel","superclasses":["IfcPropertyDefinition"],"fields":{}},"IfcProtectiveDevice":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowController"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcProtectiveDeviceTrippingUnit":{"domain":"ifcelectricaldomain","superclasses":["IfcDistributionControlElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcProtectiveDeviceTrippingUnitType":{"domain":"ifcelectricaldomain","superclasses":["IfcDistributionControlElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcProtectiveDeviceType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowControllerType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcProxy":{"domain":"ifckernel","superclasses":["IfcProduct"],"fields":{"ProxyType":{"type":"enum","reference":false,"many":false,"inverse":false},"Tag":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPump":{"domain":"ifchvacdomain","superclasses":["IfcFlowMovingDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcPumpType":{"domain":"ifchvacdomain","superclasses":["IfcFlowMovingDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcQuantityArea":{"domain":"ifcquantityresource","superclasses":["IfcPhysicalSimpleQuantity"],"fields":{"AreaValue":{"type":"double","reference":false,"many":false,"inverse":false},"AreaValueAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Formula":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcQuantityCount":{"domain":"ifcquantityresource","superclasses":["IfcPhysicalSimpleQuantity"],"fields":{"CountValue":{"type":"double","reference":false,"many":false,"inverse":false},"CountValueAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Formula":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcQuantityLength":{"domain":"ifcquantityresource","superclasses":["IfcPhysicalSimpleQuantity"],"fields":{"LengthValue":{"type":"double","reference":false,"many":false,"inverse":false},"LengthValueAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Formula":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcQuantitySet":{"domain":"ifckernel","superclasses":["IfcPropertySetDefinition"],"fields":{}},"IfcQuantityTime":{"domain":"ifcquantityresource","superclasses":["IfcPhysicalSimpleQuantity"],"fields":{"TimeValue":{"type":"double","reference":false,"many":false,"inverse":false},"TimeValueAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Formula":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcQuantityVolume":{"domain":"ifcquantityresource","superclasses":["IfcPhysicalSimpleQuantity"],"fields":{"VolumeValue":{"type":"double","reference":false,"many":false,"inverse":false},"VolumeValueAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Formula":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcQuantityWeight":{"domain":"ifcquantityresource","superclasses":["IfcPhysicalSimpleQuantity"],"fields":{"WeightValue":{"type":"double","reference":false,"many":false,"inverse":false},"WeightValueAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Formula":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRailing":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRailingType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRamp":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRampFlight":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRampFlightType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRampType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRationalBSplineCurveWithKnots":{"domain":"ifcgeometryresource","superclasses":["IfcBSplineCurveWithKnots"],"fields":{"WeightsData":{"type":"double","reference":false,"many":true,"inverse":false},"WeightsDataAsString":{"type":"string","reference":false,"many":true,"inverse":false},"Weights":{"type":"double","reference":false,"many":false,"inverse":false},"WeightsAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRationalBSplineSurfaceWithKnots":{"domain":"ifcgeometryresource","superclasses":["IfcBSplineSurfaceWithKnots"],"fields":{"WeightsData":{"type":"ListOfEDouble","reference":true,"many":true,"inverse":false},"Weights":{"type":"double","reference":false,"many":false,"inverse":false},"WeightsAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRectangleHollowProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcRectangleProfileDef"],"fields":{"WallThickness":{"type":"double","reference":false,"many":false,"inverse":false},"WallThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"InnerFilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"InnerFilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"OuterFilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"OuterFilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRectangleProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"XDim":{"type":"double","reference":false,"many":false,"inverse":false},"XDimAsString":{"type":"string","reference":false,"many":false,"inverse":false},"YDim":{"type":"double","reference":false,"many":false,"inverse":false},"YDimAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRectangularPyramid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcCsgPrimitive3D"],"fields":{"XLength":{"type":"double","reference":false,"many":false,"inverse":false},"XLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"YLength":{"type":"double","reference":false,"many":false,"inverse":false},"YLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Height":{"type":"double","reference":false,"many":false,"inverse":false},"HeightAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRectangularTrimmedSurface":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedSurface"],"fields":{"BasisSurface":{"type":"IfcSurface","reference":true,"many":false,"inverse":false},"U1":{"type":"double","reference":false,"many":false,"inverse":false},"U1AsString":{"type":"string","reference":false,"many":false,"inverse":false},"V1":{"type":"double","reference":false,"many":false,"inverse":false},"V1AsString":{"type":"string","reference":false,"many":false,"inverse":false},"U2":{"type":"double","reference":false,"many":false,"inverse":false},"U2AsString":{"type":"string","reference":false,"many":false,"inverse":false},"V2":{"type":"double","reference":false,"many":false,"inverse":false},"V2AsString":{"type":"string","reference":false,"many":false,"inverse":false},"Usense":{"type":"enum","reference":false,"many":false,"inverse":false},"Vsense":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRecurrencePattern":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{"RecurrenceType":{"type":"enum","reference":false,"many":false,"inverse":false},"DayComponent":{"type":"long","reference":false,"many":true,"inverse":false},"WeekdayComponent":{"type":"long","reference":false,"many":true,"inverse":false},"MonthComponent":{"type":"long","reference":false,"many":true,"inverse":false},"Position":{"type":"long","reference":false,"many":false,"inverse":false},"Interval":{"type":"long","reference":false,"many":false,"inverse":false},"Occurrences":{"type":"long","reference":false,"many":false,"inverse":false},"TimePeriods":{"type":"IfcTimePeriod","reference":true,"many":true,"inverse":false}}},"IfcReference":{"domain":"ifcconstraintresource","superclasses":["IfcAppliedValueSelect","IfcMetricValueSelect"],"fields":{"TypeIdentifier":{"type":"string","reference":false,"many":false,"inverse":false},"AttributeIdentifier":{"type":"string","reference":false,"many":false,"inverse":false},"InstanceName":{"type":"string","reference":false,"many":false,"inverse":false},"ListPositions":{"type":"long","reference":false,"many":true,"inverse":false},"InnerReference":{"type":"IfcReference","reference":true,"many":false,"inverse":false}}},"IfcRegularTimeSeries":{"domain":"ifcdatetimeresource","superclasses":["IfcTimeSeries"],"fields":{"TimeStep":{"type":"double","reference":false,"many":false,"inverse":false},"TimeStepAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Values":{"type":"IfcTimeSeriesValue","reference":true,"many":true,"inverse":false}}},"IfcReinforcementBarProperties":{"domain":"ifcprofileresource","superclasses":["IfcPreDefinedProperties"],"fields":{"TotalCrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"TotalCrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SteelGrade":{"type":"string","reference":false,"many":false,"inverse":false},"BarSurface":{"type":"enum","reference":false,"many":false,"inverse":false},"EffectiveDepth":{"type":"double","reference":false,"many":false,"inverse":false},"EffectiveDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"NominalBarDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"NominalBarDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BarCount":{"type":"double","reference":false,"many":false,"inverse":false},"BarCountAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcReinforcementDefinitionProperties":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcPreDefinedPropertySet"],"fields":{"DefinitionType":{"type":"string","reference":false,"many":false,"inverse":false},"ReinforcementSectionDefinitions":{"type":"IfcSectionReinforcementProperties","reference":true,"many":true,"inverse":false}}},"IfcReinforcingBar":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcReinforcingElement"],"fields":{"NominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"NominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"CrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BarLength":{"type":"double","reference":false,"many":false,"inverse":false},"BarLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"BarSurface":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcReinforcingBarType":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcReinforcingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"NominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"NominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"CrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BarLength":{"type":"double","reference":false,"many":false,"inverse":false},"BarLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BarSurface":{"type":"enum","reference":false,"many":false,"inverse":false},"BendingShapeCode":{"type":"string","reference":false,"many":false,"inverse":false},"BendingParameters":{"type":"IfcBendingParameterSelect","reference":true,"many":true,"inverse":false}}},"IfcReinforcingElement":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcElementComponent"],"fields":{"SteelGrade":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcReinforcingElementType":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcElementComponentType"],"fields":{}},"IfcReinforcingMesh":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcReinforcingElement"],"fields":{"MeshLength":{"type":"double","reference":false,"many":false,"inverse":false},"MeshLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"MeshWidth":{"type":"double","reference":false,"many":false,"inverse":false},"MeshWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LongitudinalBarNominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"LongitudinalBarNominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransverseBarNominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"TransverseBarNominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LongitudinalBarCrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"LongitudinalBarCrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransverseBarCrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"TransverseBarCrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LongitudinalBarSpacing":{"type":"double","reference":false,"many":false,"inverse":false},"LongitudinalBarSpacingAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransverseBarSpacing":{"type":"double","reference":false,"many":false,"inverse":false},"TransverseBarSpacingAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcReinforcingMeshType":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcReinforcingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"MeshLength":{"type":"double","reference":false,"many":false,"inverse":false},"MeshLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"MeshWidth":{"type":"double","reference":false,"many":false,"inverse":false},"MeshWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LongitudinalBarNominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"LongitudinalBarNominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransverseBarNominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"TransverseBarNominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LongitudinalBarCrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"LongitudinalBarCrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransverseBarCrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"TransverseBarCrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LongitudinalBarSpacing":{"type":"double","reference":false,"many":false,"inverse":false},"LongitudinalBarSpacingAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransverseBarSpacing":{"type":"double","reference":false,"many":false,"inverse":false},"TransverseBarSpacingAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BendingShapeCode":{"type":"string","reference":false,"many":false,"inverse":false},"BendingParameters":{"type":"IfcBendingParameterSelect","reference":true,"many":true,"inverse":false}}},"IfcRelAggregates":{"domain":"ifckernel","superclasses":["IfcRelDecomposes"],"fields":{"RelatingObject":{"type":"IfcObjectDefinition","reference":true,"many":false,"inverse":true},"RelatedObjects":{"type":"IfcObjectDefinition","reference":true,"many":true,"inverse":true}}},"IfcRelAssigns":{"domain":"ifckernel","superclasses":["IfcRelationship"],"fields":{"RelatedObjects":{"type":"IfcObjectDefinition","reference":true,"many":true,"inverse":true},"RelatedObjectsType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRelAssignsToActor":{"domain":"ifckernel","superclasses":["IfcRelAssigns"],"fields":{"RelatingActor":{"type":"IfcActor","reference":true,"many":false,"inverse":true},"ActingRole":{"type":"IfcActorRole","reference":true,"many":false,"inverse":false}}},"IfcRelAssignsToControl":{"domain":"ifckernel","superclasses":["IfcRelAssigns"],"fields":{"RelatingControl":{"type":"IfcControl","reference":true,"many":false,"inverse":true}}},"IfcRelAssignsToGroup":{"domain":"ifckernel","superclasses":["IfcRelAssigns"],"fields":{"RelatingGroup":{"type":"IfcGroup","reference":true,"many":false,"inverse":true}}},"IfcRelAssignsToGroupByFactor":{"domain":"ifckernel","superclasses":["IfcRelAssignsToGroup"],"fields":{"Factor":{"type":"double","reference":false,"many":false,"inverse":false},"FactorAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRelAssignsToProcess":{"domain":"ifckernel","superclasses":["IfcRelAssigns"],"fields":{"RelatingProcess":{"type":"IfcProcessSelect","reference":true,"many":false,"inverse":true},"QuantityInProcess":{"type":"IfcMeasureWithUnit","reference":true,"many":false,"inverse":false}}},"IfcRelAssignsToProduct":{"domain":"ifckernel","superclasses":["IfcRelAssigns"],"fields":{"RelatingProduct":{"type":"IfcProductSelect","reference":true,"many":false,"inverse":true}}},"IfcRelAssignsToResource":{"domain":"ifckernel","superclasses":["IfcRelAssigns"],"fields":{"RelatingResource":{"type":"IfcResourceSelect","reference":true,"many":false,"inverse":true}}},"IfcRelAssociates":{"domain":"ifckernel","superclasses":["IfcRelationship"],"fields":{"RelatedObjects":{"type":"IfcDefinitionSelect","reference":true,"many":true,"inverse":true}}},"IfcRelAssociatesApproval":{"domain":"ifccontrolextension","superclasses":["IfcRelAssociates"],"fields":{"RelatingApproval":{"type":"IfcApproval","reference":true,"many":false,"inverse":true}}},"IfcRelAssociatesClassification":{"domain":"ifckernel","superclasses":["IfcRelAssociates"],"fields":{"RelatingClassification":{"type":"IfcClassificationSelect","reference":true,"many":false,"inverse":true}}},"IfcRelAssociatesConstraint":{"domain":"ifccontrolextension","superclasses":["IfcRelAssociates"],"fields":{"Intent":{"type":"string","reference":false,"many":false,"inverse":false},"RelatingConstraint":{"type":"IfcConstraint","reference":true,"many":false,"inverse":false}}},"IfcRelAssociatesDocument":{"domain":"ifckernel","superclasses":["IfcRelAssociates"],"fields":{"RelatingDocument":{"type":"IfcDocumentSelect","reference":true,"many":false,"inverse":true}}},"IfcRelAssociatesLibrary":{"domain":"ifckernel","superclasses":["IfcRelAssociates"],"fields":{"RelatingLibrary":{"type":"IfcLibrarySelect","reference":true,"many":false,"inverse":true}}},"IfcRelAssociatesMaterial":{"domain":"ifcproductextension","superclasses":["IfcRelAssociates"],"fields":{"RelatingMaterial":{"type":"IfcMaterialSelect","reference":true,"many":false,"inverse":true}}},"IfcRelConnects":{"domain":"ifckernel","superclasses":["IfcRelationship"],"fields":{}},"IfcRelConnectsElements":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"ConnectionGeometry":{"type":"IfcConnectionGeometry","reference":true,"many":false,"inverse":false},"RelatingElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true},"RelatedElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true}}},"IfcRelConnectsPathElements":{"domain":"ifcsharedbldgelements","superclasses":["IfcRelConnectsElements"],"fields":{"RelatingPriorities":{"type":"long","reference":false,"many":true,"inverse":false},"RelatedPriorities":{"type":"long","reference":false,"many":true,"inverse":false},"RelatedConnectionType":{"type":"enum","reference":false,"many":false,"inverse":false},"RelatingConnectionType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRelConnectsPortToElement":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"RelatingPort":{"type":"IfcPort","reference":true,"many":false,"inverse":true},"RelatedElement":{"type":"IfcDistributionElement","reference":true,"many":false,"inverse":true}}},"IfcRelConnectsPorts":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"RelatingPort":{"type":"IfcPort","reference":true,"many":false,"inverse":true},"RelatedPort":{"type":"IfcPort","reference":true,"many":false,"inverse":true},"RealizingElement":{"type":"IfcElement","reference":true,"many":false,"inverse":false}}},"IfcRelConnectsStructuralActivity":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcRelConnects"],"fields":{"RelatingElement":{"type":"IfcStructuralActivityAssignmentSelect","reference":true,"many":false,"inverse":true},"RelatedStructuralActivity":{"type":"IfcStructuralActivity","reference":true,"many":false,"inverse":true}}},"IfcRelConnectsStructuralMember":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcRelConnects"],"fields":{"RelatingStructuralMember":{"type":"IfcStructuralMember","reference":true,"many":false,"inverse":true},"RelatedStructuralConnection":{"type":"IfcStructuralConnection","reference":true,"many":false,"inverse":true},"AppliedCondition":{"type":"IfcBoundaryCondition","reference":true,"many":false,"inverse":false},"AdditionalConditions":{"type":"IfcStructuralConnectionCondition","reference":true,"many":false,"inverse":false},"SupportedLength":{"type":"double","reference":false,"many":false,"inverse":false},"SupportedLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ConditionCoordinateSystem":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false}}},"IfcRelConnectsWithEccentricity":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcRelConnectsStructuralMember"],"fields":{"ConnectionConstraint":{"type":"IfcConnectionGeometry","reference":true,"many":false,"inverse":false}}},"IfcRelConnectsWithRealizingElements":{"domain":"ifcproductextension","superclasses":["IfcRelConnectsElements"],"fields":{"RealizingElements":{"type":"IfcElement","reference":true,"many":true,"inverse":true},"ConnectionType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRelContainedInSpatialStructure":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"RelatedElements":{"type":"IfcProduct","reference":true,"many":true,"inverse":true},"RelatingStructure":{"type":"IfcSpatialElement","reference":true,"many":false,"inverse":true}}},"IfcRelCoversBldgElements":{"domain":"ifcsharedbldgelements","superclasses":["IfcRelConnects"],"fields":{"RelatingBuildingElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true},"RelatedCoverings":{"type":"IfcCovering","reference":true,"many":true,"inverse":true}}},"IfcRelCoversSpaces":{"domain":"ifcsharedbldgelements","superclasses":["IfcRelConnects"],"fields":{"RelatingSpace":{"type":"IfcSpace","reference":true,"many":false,"inverse":true},"RelatedCoverings":{"type":"IfcCovering","reference":true,"many":true,"inverse":true}}},"IfcRelDeclares":{"domain":"ifckernel","superclasses":["IfcRelationship"],"fields":{"RelatingContext":{"type":"IfcContext","reference":true,"many":false,"inverse":true},"RelatedDefinitions":{"type":"IfcDefinitionSelect","reference":true,"many":true,"inverse":true}}},"IfcRelDecomposes":{"domain":"ifckernel","superclasses":["IfcRelationship"],"fields":{}},"IfcRelDefines":{"domain":"ifckernel","superclasses":["IfcRelationship"],"fields":{}},"IfcRelDefinesByObject":{"domain":"ifckernel","superclasses":["IfcRelDefines"],"fields":{"RelatedObjects":{"type":"IfcObject","reference":true,"many":true,"inverse":true},"RelatingObject":{"type":"IfcObject","reference":true,"many":false,"inverse":true}}},"IfcRelDefinesByProperties":{"domain":"ifckernel","superclasses":["IfcRelDefines"],"fields":{"RelatedObjects":{"type":"IfcObjectDefinition","reference":true,"many":true,"inverse":true},"RelatingPropertyDefinition":{"type":"IfcPropertySetDefinitionSelect","reference":true,"many":false,"inverse":true}}},"IfcRelDefinesByTemplate":{"domain":"ifckernel","superclasses":["IfcRelDefines"],"fields":{"RelatedPropertySets":{"type":"IfcPropertySetDefinition","reference":true,"many":true,"inverse":true},"RelatingTemplate":{"type":"IfcPropertySetTemplate","reference":true,"many":false,"inverse":true}}},"IfcRelDefinesByType":{"domain":"ifckernel","superclasses":["IfcRelDefines"],"fields":{"RelatedObjects":{"type":"IfcObject","reference":true,"many":true,"inverse":true},"RelatingType":{"type":"IfcTypeObject","reference":true,"many":false,"inverse":true}}},"IfcRelFillsElement":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"RelatingOpeningElement":{"type":"IfcOpeningElement","reference":true,"many":false,"inverse":true},"RelatedBuildingElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true}}},"IfcRelFlowControlElements":{"domain":"ifcsharedbldgserviceelements","superclasses":["IfcRelConnects"],"fields":{"RelatedControlElements":{"type":"IfcDistributionControlElement","reference":true,"many":true,"inverse":true},"RelatingFlowElement":{"type":"IfcDistributionFlowElement","reference":true,"many":false,"inverse":true}}},"IfcRelInterferesElements":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"RelatingElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true},"RelatedElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true},"InterferenceGeometry":{"type":"IfcConnectionGeometry","reference":true,"many":false,"inverse":false},"InterferenceType":{"type":"string","reference":false,"many":false,"inverse":false},"ImpliedOrder":{"type":"boolean","reference":false,"many":false,"inverse":false}}},"IfcRelNests":{"domain":"ifckernel","superclasses":["IfcRelDecomposes"],"fields":{"RelatingObject":{"type":"IfcObjectDefinition","reference":true,"many":false,"inverse":true},"RelatedObjects":{"type":"IfcObjectDefinition","reference":true,"many":true,"inverse":true}}},"IfcRelProjectsElement":{"domain":"ifcproductextension","superclasses":["IfcRelDecomposes"],"fields":{"RelatingElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true},"RelatedFeatureElement":{"type":"IfcFeatureElementAddition","reference":true,"many":false,"inverse":true}}},"IfcRelReferencedInSpatialStructure":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"RelatedElements":{"type":"IfcProduct","reference":true,"many":true,"inverse":true},"RelatingStructure":{"type":"IfcSpatialElement","reference":true,"many":false,"inverse":true}}},"IfcRelSequence":{"domain":"ifcprocessextension","superclasses":["IfcRelConnects"],"fields":{"RelatingProcess":{"type":"IfcProcess","reference":true,"many":false,"inverse":true},"RelatedProcess":{"type":"IfcProcess","reference":true,"many":false,"inverse":true},"TimeLag":{"type":"IfcLagTime","reference":true,"many":false,"inverse":false},"SequenceType":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedSequenceType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRelServicesBuildings":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"RelatingSystem":{"type":"IfcSystem","reference":true,"many":false,"inverse":true},"RelatedBuildings":{"type":"IfcSpatialElement","reference":true,"many":true,"inverse":true}}},"IfcRelSpaceBoundary":{"domain":"ifcproductextension","superclasses":["IfcRelConnects"],"fields":{"RelatingSpace":{"type":"IfcSpaceBoundarySelect","reference":true,"many":false,"inverse":true},"RelatedBuildingElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true},"ConnectionGeometry":{"type":"IfcConnectionGeometry","reference":true,"many":false,"inverse":false},"PhysicalOrVirtualBoundary":{"type":"enum","reference":false,"many":false,"inverse":false},"InternalOrExternalBoundary":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRelSpaceBoundary1stLevel":{"domain":"ifcproductextension","superclasses":["IfcRelSpaceBoundary"],"fields":{"ParentBoundary":{"type":"IfcRelSpaceBoundary1stLevel","reference":true,"many":false,"inverse":true},"InnerBoundaries":{"type":"IfcRelSpaceBoundary1stLevel","reference":true,"many":true,"inverse":true}}},"IfcRelSpaceBoundary2ndLevel":{"domain":"ifcproductextension","superclasses":["IfcRelSpaceBoundary1stLevel"],"fields":{"CorrespondingBoundary":{"type":"IfcRelSpaceBoundary2ndLevel","reference":true,"many":false,"inverse":true},"Corresponds":{"type":"IfcRelSpaceBoundary2ndLevel","reference":true,"many":true,"inverse":true}}},"IfcRelVoidsElement":{"domain":"ifcproductextension","superclasses":["IfcRelDecomposes"],"fields":{"RelatingBuildingElement":{"type":"IfcElement","reference":true,"many":false,"inverse":true},"RelatedOpeningElement":{"type":"IfcFeatureElementSubtraction","reference":true,"many":false,"inverse":true}}},"IfcRelationship":{"domain":"ifckernel","superclasses":["IfcRoot"],"fields":{}},"IfcReparametrisedCompositeCurveSegment":{"domain":"ifcgeometryresource","superclasses":["IfcCompositeCurveSegment"],"fields":{"ParamLength":{"type":"double","reference":false,"many":false,"inverse":false},"ParamLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRepresentation":{"domain":"ifcrepresentationresource","superclasses":["IfcLayeredItem"],"fields":{"ContextOfItems":{"type":"IfcRepresentationContext","reference":true,"many":false,"inverse":true},"RepresentationIdentifier":{"type":"string","reference":false,"many":false,"inverse":false},"RepresentationType":{"type":"string","reference":false,"many":false,"inverse":false},"Items":{"type":"IfcRepresentationItem","reference":true,"many":true,"inverse":false},"RepresentationMap":{"type":"IfcRepresentationMap","reference":true,"many":true,"inverse":true},"LayerAssignments":{"type":"IfcPresentationLayerAssignment","reference":true,"many":true,"inverse":true},"OfProductRepresentation":{"type":"IfcProductRepresentation","reference":true,"many":true,"inverse":true}}},"IfcRepresentationContext":{"domain":"ifcrepresentationresource","superclasses":[],"fields":{"ContextIdentifier":{"type":"string","reference":false,"many":false,"inverse":false},"ContextType":{"type":"string","reference":false,"many":false,"inverse":false},"RepresentationsInContext":{"type":"IfcRepresentation","reference":true,"many":true,"inverse":true}}},"IfcRepresentationItem":{"domain":"ifcgeometryresource","superclasses":["IfcLayeredItem"],"fields":{"LayerAssignment":{"type":"IfcPresentationLayerAssignment","reference":true,"many":true,"inverse":true},"StyledByItem":{"type":"IfcStyledItem","reference":true,"many":true,"inverse":true}}},"IfcRepresentationMap":{"domain":"ifcgeometryresource","superclasses":["IfcProductRepresentationSelect"],"fields":{"MappingOrigin":{"type":"IfcAxis2Placement","reference":true,"many":false,"inverse":false},"MappedRepresentation":{"type":"IfcRepresentation","reference":true,"many":false,"inverse":true},"HasShapeAspects":{"type":"IfcShapeAspect","reference":true,"many":true,"inverse":true},"MapUsage":{"type":"IfcMappedItem","reference":true,"many":true,"inverse":true}}},"IfcResource":{"domain":"ifckernel","superclasses":["IfcObject","IfcResourceSelect"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"LongDescription":{"type":"string","reference":false,"many":false,"inverse":false},"ResourceOf":{"type":"IfcRelAssignsToResource","reference":true,"many":true,"inverse":true}}},"IfcResourceApprovalRelationship":{"domain":"ifcapprovalresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"RelatedResourceObjects":{"type":"IfcResourceObjectSelect","reference":true,"many":true,"inverse":true},"RelatingApproval":{"type":"IfcApproval","reference":true,"many":false,"inverse":true}}},"IfcResourceConstraintRelationship":{"domain":"ifcconstraintresource","superclasses":["IfcResourceLevelRelationship"],"fields":{"RelatingConstraint":{"type":"IfcConstraint","reference":true,"many":false,"inverse":true},"RelatedResourceObjects":{"type":"IfcResourceObjectSelect","reference":true,"many":true,"inverse":true}}},"IfcResourceLevelRelationship":{"domain":"ifcexternalreferenceresource","superclasses":[],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcResourceTime":{"domain":"ifcdatetimeresource","superclasses":["IfcSchedulingTime"],"fields":{"ScheduleWork":{"type":"string","reference":false,"many":false,"inverse":false},"ScheduleUsage":{"type":"double","reference":false,"many":false,"inverse":false},"ScheduleUsageAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ScheduleStart":{"type":"string","reference":false,"many":false,"inverse":false},"ScheduleFinish":{"type":"string","reference":false,"many":false,"inverse":false},"ScheduleContour":{"type":"string","reference":false,"many":false,"inverse":false},"LevelingDelay":{"type":"string","reference":false,"many":false,"inverse":false},"IsOverAllocated":{"type":"enum","reference":false,"many":false,"inverse":false},"StatusTime":{"type":"string","reference":false,"many":false,"inverse":false},"ActualWork":{"type":"string","reference":false,"many":false,"inverse":false},"ActualUsage":{"type":"double","reference":false,"many":false,"inverse":false},"ActualUsageAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ActualStart":{"type":"string","reference":false,"many":false,"inverse":false},"ActualFinish":{"type":"string","reference":false,"many":false,"inverse":false},"RemainingWork":{"type":"string","reference":false,"many":false,"inverse":false},"RemainingUsage":{"type":"double","reference":false,"many":false,"inverse":false},"RemainingUsageAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Completion":{"type":"double","reference":false,"many":false,"inverse":false},"CompletionAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRevolvedAreaSolid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSweptAreaSolid"],"fields":{"Axis":{"type":"IfcAxis1Placement","reference":true,"many":false,"inverse":false},"Angle":{"type":"double","reference":false,"many":false,"inverse":false},"AngleAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRevolvedAreaSolidTapered":{"domain":"ifcgeometricmodelresource","superclasses":["IfcRevolvedAreaSolid"],"fields":{"EndSweptArea":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":false}}},"IfcRightCircularCone":{"domain":"ifcgeometricmodelresource","superclasses":["IfcCsgPrimitive3D"],"fields":{"Height":{"type":"double","reference":false,"many":false,"inverse":false},"HeightAsString":{"type":"string","reference":false,"many":false,"inverse":false},"BottomRadius":{"type":"double","reference":false,"many":false,"inverse":false},"BottomRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRightCircularCylinder":{"domain":"ifcgeometricmodelresource","superclasses":["IfcCsgPrimitive3D"],"fields":{"Height":{"type":"double","reference":false,"many":false,"inverse":false},"HeightAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Radius":{"type":"double","reference":false,"many":false,"inverse":false},"RadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRoof":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRoofType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcRoot":{"domain":"ifckernel","superclasses":[],"fields":{"GlobalId":{"type":"string","reference":false,"many":false,"inverse":false},"OwnerHistory":{"type":"IfcOwnerHistory","reference":true,"many":false,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRoundedRectangleProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcRectangleProfileDef"],"fields":{"RoundingRadius":{"type":"double","reference":false,"many":false,"inverse":false},"RoundingRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSIUnit":{"domain":"ifcmeasureresource","superclasses":["IfcNamedUnit"],"fields":{"Prefix":{"type":"enum","reference":false,"many":false,"inverse":false},"Name":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSanitaryTerminal":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSanitaryTerminalType":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSchedulingTime":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"DataOrigin":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedDataOrigin":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSeamCurve":{"domain":"ifcgeometryresource","superclasses":["IfcSurfaceCurve"],"fields":{}},"IfcSectionProperties":{"domain":"ifcprofileresource","superclasses":["IfcPreDefinedProperties"],"fields":{"SectionType":{"type":"enum","reference":false,"many":false,"inverse":false},"StartProfile":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":false},"EndProfile":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":false}}},"IfcSectionReinforcementProperties":{"domain":"ifcprofileresource","superclasses":["IfcPreDefinedProperties"],"fields":{"LongitudinalStartPosition":{"type":"double","reference":false,"many":false,"inverse":false},"LongitudinalStartPositionAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LongitudinalEndPosition":{"type":"double","reference":false,"many":false,"inverse":false},"LongitudinalEndPositionAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransversePosition":{"type":"double","reference":false,"many":false,"inverse":false},"TransversePositionAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ReinforcementRole":{"type":"enum","reference":false,"many":false,"inverse":false},"SectionDefinition":{"type":"IfcSectionProperties","reference":true,"many":false,"inverse":false},"CrossSectionReinforcementDefinitions":{"type":"IfcReinforcementBarProperties","reference":true,"many":true,"inverse":false}}},"IfcSectionedSpine":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"SpineCurve":{"type":"IfcCompositeCurve","reference":true,"many":false,"inverse":false},"CrossSections":{"type":"IfcProfileDef","reference":true,"many":true,"inverse":false},"CrossSectionPositions":{"type":"IfcAxis2Placement3D","reference":true,"many":true,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcSensor":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSensorType":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcShadingDevice":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcShadingDeviceType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcShapeAspect":{"domain":"ifcrepresentationresource","superclasses":[],"fields":{"ShapeRepresentations":{"type":"IfcShapeModel","reference":true,"many":true,"inverse":true},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"ProductDefinitional":{"type":"enum","reference":false,"many":false,"inverse":false},"PartOfProductDefinitionShape":{"type":"IfcProductRepresentationSelect","reference":true,"many":false,"inverse":true}}},"IfcShapeModel":{"domain":"ifcrepresentationresource","superclasses":["IfcRepresentation"],"fields":{"OfShapeAspect":{"type":"IfcShapeAspect","reference":true,"many":true,"inverse":true}}},"IfcShapeRepresentation":{"domain":"ifcrepresentationresource","superclasses":["IfcShapeModel"],"fields":{}},"IfcShellBasedSurfaceModel":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"SbsmBoundary":{"type":"IfcShell","reference":true,"many":true,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcSimpleProperty":{"domain":"ifcpropertyresource","superclasses":["IfcProperty"],"fields":{}},"IfcSimplePropertyTemplate":{"domain":"ifckernel","superclasses":["IfcPropertyTemplate"],"fields":{"TemplateType":{"type":"enum","reference":false,"many":false,"inverse":false},"PrimaryMeasureType":{"type":"string","reference":false,"many":false,"inverse":false},"SecondaryMeasureType":{"type":"string","reference":false,"many":false,"inverse":false},"Enumerators":{"type":"IfcPropertyEnumeration","reference":true,"many":false,"inverse":false},"PrimaryUnit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false},"SecondaryUnit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false},"Expression":{"type":"string","reference":false,"many":false,"inverse":false},"AccessState":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSite":{"domain":"ifcproductextension","superclasses":["IfcSpatialStructureElement"],"fields":{"RefLatitude":{"type":"long","reference":false,"many":true,"inverse":false},"RefLongitude":{"type":"long","reference":false,"many":true,"inverse":false},"RefElevation":{"type":"double","reference":false,"many":false,"inverse":false},"RefElevationAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LandTitleNumber":{"type":"string","reference":false,"many":false,"inverse":false},"SiteAddress":{"type":"IfcPostalAddress","reference":true,"many":false,"inverse":false}}},"IfcSlab":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSlabElementedCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcSlab"],"fields":{}},"IfcSlabStandardCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcSlab"],"fields":{}},"IfcSlabType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSlippageConnectionCondition":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralConnectionCondition"],"fields":{"SlippageX":{"type":"double","reference":false,"many":false,"inverse":false},"SlippageXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SlippageY":{"type":"double","reference":false,"many":false,"inverse":false},"SlippageYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SlippageZ":{"type":"double","reference":false,"many":false,"inverse":false},"SlippageZAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSolarDevice":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSolarDeviceType":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSolidModel":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem","IfcBooleanOperand","IfcSolidOrShell"],"fields":{"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcSpace":{"domain":"ifcproductextension","superclasses":["IfcSpatialStructureElement","IfcSpaceBoundarySelect"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"ElevationWithFlooring":{"type":"double","reference":false,"many":false,"inverse":false},"ElevationWithFlooringAsString":{"type":"string","reference":false,"many":false,"inverse":false},"HasCoverings":{"type":"IfcRelCoversSpaces","reference":true,"many":true,"inverse":true},"BoundedBy":{"type":"IfcRelSpaceBoundary","reference":true,"many":true,"inverse":true}}},"IfcSpaceHeater":{"domain":"ifchvacdomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSpaceHeaterType":{"domain":"ifchvacdomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSpaceType":{"domain":"ifcproductextension","superclasses":["IfcSpatialStructureElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"LongName":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSpatialElement":{"domain":"ifcproductextension","superclasses":["IfcProduct"],"fields":{"LongName":{"type":"string","reference":false,"many":false,"inverse":false},"ContainsElements":{"type":"IfcRelContainedInSpatialStructure","reference":true,"many":true,"inverse":true},"ServicedBySystems":{"type":"IfcRelServicesBuildings","reference":true,"many":true,"inverse":true},"ReferencesElements":{"type":"IfcRelReferencedInSpatialStructure","reference":true,"many":true,"inverse":true}}},"IfcSpatialElementType":{"domain":"ifcproductextension","superclasses":["IfcTypeProduct"],"fields":{"ElementType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSpatialStructureElement":{"domain":"ifcproductextension","superclasses":["IfcSpatialElement"],"fields":{"CompositionType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSpatialStructureElementType":{"domain":"ifcproductextension","superclasses":["IfcSpatialElementType"],"fields":{}},"IfcSpatialZone":{"domain":"ifcproductextension","superclasses":["IfcSpatialElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSpatialZoneType":{"domain":"ifcproductextension","superclasses":["IfcSpatialElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"LongName":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSphere":{"domain":"ifcgeometricmodelresource","superclasses":["IfcCsgPrimitive3D"],"fields":{"Radius":{"type":"double","reference":false,"many":false,"inverse":false},"RadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSphericalSurface":{"domain":"ifcgeometryresource","superclasses":["IfcElementarySurface"],"fields":{"Radius":{"type":"double","reference":false,"many":false,"inverse":false},"RadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStackTerminal":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStackTerminalType":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStair":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStairFlight":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"NumberOfRisers":{"type":"long","reference":false,"many":false,"inverse":false},"NumberOfTreads":{"type":"long","reference":false,"many":false,"inverse":false},"RiserHeight":{"type":"double","reference":false,"many":false,"inverse":false},"RiserHeightAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TreadLength":{"type":"double","reference":false,"many":false,"inverse":false},"TreadLengthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStairFlightType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStairType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStructuralAction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralActivity"],"fields":{"DestabilizingLoad":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStructuralActivity":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcProduct"],"fields":{"AppliedLoad":{"type":"IfcStructuralLoad","reference":true,"many":false,"inverse":false},"GlobalOrLocal":{"type":"enum","reference":false,"many":false,"inverse":false},"AssignedToStructuralItem":{"type":"IfcRelConnectsStructuralActivity","reference":true,"many":true,"inverse":true}}},"IfcStructuralAnalysisModel":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcSystem"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"OrientationOf2DPlane":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false},"LoadedBy":{"type":"IfcStructuralLoadGroup","reference":true,"many":true,"inverse":true},"HasResults":{"type":"IfcStructuralResultGroup","reference":true,"many":true,"inverse":true},"SharedPlacement":{"type":"IfcObjectPlacement","reference":true,"many":false,"inverse":false}}},"IfcStructuralConnection":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralItem"],"fields":{"AppliedCondition":{"type":"IfcBoundaryCondition","reference":true,"many":false,"inverse":false},"ConnectsStructuralMembers":{"type":"IfcRelConnectsStructuralMember","reference":true,"many":true,"inverse":true}}},"IfcStructuralConnectionCondition":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralCurveAction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralAction"],"fields":{"ProjectedOrTrue":{"type":"enum","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStructuralCurveConnection":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralConnection"],"fields":{"Axis":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcStructuralCurveMember":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralMember"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"Axis":{"type":"IfcDirection","reference":true,"many":false,"inverse":false}}},"IfcStructuralCurveMemberVarying":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralCurveMember"],"fields":{}},"IfcStructuralCurveReaction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralReaction"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStructuralItem":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcProduct","IfcStructuralActivityAssignmentSelect"],"fields":{"AssignedStructuralActivity":{"type":"IfcRelConnectsStructuralActivity","reference":true,"many":true,"inverse":true}}},"IfcStructuralLinearAction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralCurveAction"],"fields":{}},"IfcStructuralLoad":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralLoadCase":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralLoadGroup"],"fields":{"SelfWeightCoefficients":{"type":"double","reference":false,"many":true,"inverse":false},"SelfWeightCoefficientsAsString":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcStructuralLoadConfiguration":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoad"],"fields":{"Values":{"type":"IfcStructuralLoadOrResult","reference":true,"many":true,"inverse":false},"Locations":{"type":"ListOfIfcLengthMeasure","reference":true,"many":true,"inverse":false}}},"IfcStructuralLoadGroup":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcGroup"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"ActionType":{"type":"enum","reference":false,"many":false,"inverse":false},"ActionSource":{"type":"enum","reference":false,"many":false,"inverse":false},"Coefficient":{"type":"double","reference":false,"many":false,"inverse":false},"CoefficientAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Purpose":{"type":"string","reference":false,"many":false,"inverse":false},"SourceOfResultGroup":{"type":"IfcStructuralResultGroup","reference":true,"many":true,"inverse":true},"LoadGroupFor":{"type":"IfcStructuralAnalysisModel","reference":true,"many":true,"inverse":true}}},"IfcStructuralLoadLinearForce":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadStatic"],"fields":{"LinearForceX":{"type":"double","reference":false,"many":false,"inverse":false},"LinearForceXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LinearForceY":{"type":"double","reference":false,"many":false,"inverse":false},"LinearForceYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LinearForceZ":{"type":"double","reference":false,"many":false,"inverse":false},"LinearForceZAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LinearMomentX":{"type":"double","reference":false,"many":false,"inverse":false},"LinearMomentXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LinearMomentY":{"type":"double","reference":false,"many":false,"inverse":false},"LinearMomentYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LinearMomentZ":{"type":"double","reference":false,"many":false,"inverse":false},"LinearMomentZAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralLoadOrResult":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoad"],"fields":{}},"IfcStructuralLoadPlanarForce":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadStatic"],"fields":{"PlanarForceX":{"type":"double","reference":false,"many":false,"inverse":false},"PlanarForceXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PlanarForceY":{"type":"double","reference":false,"many":false,"inverse":false},"PlanarForceYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PlanarForceZ":{"type":"double","reference":false,"many":false,"inverse":false},"PlanarForceZAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralLoadSingleDisplacement":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadStatic"],"fields":{"DisplacementX":{"type":"double","reference":false,"many":false,"inverse":false},"DisplacementXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"DisplacementY":{"type":"double","reference":false,"many":false,"inverse":false},"DisplacementYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"DisplacementZ":{"type":"double","reference":false,"many":false,"inverse":false},"DisplacementZAsString":{"type":"string","reference":false,"many":false,"inverse":false},"RotationalDisplacementRX":{"type":"double","reference":false,"many":false,"inverse":false},"RotationalDisplacementRXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"RotationalDisplacementRY":{"type":"double","reference":false,"many":false,"inverse":false},"RotationalDisplacementRYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"RotationalDisplacementRZ":{"type":"double","reference":false,"many":false,"inverse":false},"RotationalDisplacementRZAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralLoadSingleDisplacementDistortion":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadSingleDisplacement"],"fields":{"Distortion":{"type":"double","reference":false,"many":false,"inverse":false},"DistortionAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralLoadSingleForce":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadStatic"],"fields":{"ForceX":{"type":"double","reference":false,"many":false,"inverse":false},"ForceXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ForceY":{"type":"double","reference":false,"many":false,"inverse":false},"ForceYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ForceZ":{"type":"double","reference":false,"many":false,"inverse":false},"ForceZAsString":{"type":"string","reference":false,"many":false,"inverse":false},"MomentX":{"type":"double","reference":false,"many":false,"inverse":false},"MomentXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"MomentY":{"type":"double","reference":false,"many":false,"inverse":false},"MomentYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"MomentZ":{"type":"double","reference":false,"many":false,"inverse":false},"MomentZAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralLoadSingleForceWarping":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadSingleForce"],"fields":{"WarpingMoment":{"type":"double","reference":false,"many":false,"inverse":false},"WarpingMomentAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralLoadStatic":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadOrResult"],"fields":{}},"IfcStructuralLoadTemperature":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadStatic"],"fields":{"DeltaTConstant":{"type":"double","reference":false,"many":false,"inverse":false},"DeltaTConstantAsString":{"type":"string","reference":false,"many":false,"inverse":false},"DeltaTY":{"type":"double","reference":false,"many":false,"inverse":false},"DeltaTYAsString":{"type":"string","reference":false,"many":false,"inverse":false},"DeltaTZ":{"type":"double","reference":false,"many":false,"inverse":false},"DeltaTZAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralMember":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralItem"],"fields":{"ConnectedBy":{"type":"IfcRelConnectsStructuralMember","reference":true,"many":true,"inverse":true}}},"IfcStructuralPlanarAction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralSurfaceAction"],"fields":{}},"IfcStructuralPointAction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralAction"],"fields":{}},"IfcStructuralPointConnection":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralConnection"],"fields":{"ConditionCoordinateSystem":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false}}},"IfcStructuralPointReaction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralReaction"],"fields":{}},"IfcStructuralReaction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralActivity"],"fields":{}},"IfcStructuralResultGroup":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcGroup"],"fields":{"TheoryType":{"type":"enum","reference":false,"many":false,"inverse":false},"ResultForLoadGroup":{"type":"IfcStructuralLoadGroup","reference":true,"many":false,"inverse":true},"IsLinear":{"type":"enum","reference":false,"many":false,"inverse":false},"ResultGroupFor":{"type":"IfcStructuralAnalysisModel","reference":true,"many":true,"inverse":true}}},"IfcStructuralSurfaceAction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralAction"],"fields":{"ProjectedOrTrue":{"type":"enum","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStructuralSurfaceConnection":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralConnection"],"fields":{}},"IfcStructuralSurfaceMember":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralMember"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"Thickness":{"type":"double","reference":false,"many":false,"inverse":false},"ThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStructuralSurfaceMemberVarying":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralSurfaceMember"],"fields":{}},"IfcStructuralSurfaceReaction":{"domain":"ifcstructuralanalysisdomain","superclasses":["IfcStructuralReaction"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcStyleModel":{"domain":"ifcrepresentationresource","superclasses":["IfcRepresentation"],"fields":{}},"IfcStyledItem":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcRepresentationItem"],"fields":{"Item":{"type":"IfcRepresentationItem","reference":true,"many":false,"inverse":true},"Styles":{"type":"IfcStyleAssignmentSelect","reference":true,"many":true,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStyledRepresentation":{"domain":"ifcrepresentationresource","superclasses":["IfcStyleModel"],"fields":{}},"IfcSubContractResource":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResource"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSubContractResourceType":{"domain":"ifcconstructionmgmtdomain","superclasses":["IfcConstructionResourceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSubedge":{"domain":"ifctopologyresource","superclasses":["IfcEdge"],"fields":{"ParentEdge":{"type":"IfcEdge","reference":true,"many":false,"inverse":false}}},"IfcSurface":{"domain":"ifcgeometryresource","superclasses":["IfcGeometricRepresentationItem","IfcGeometricSetSelect","IfcSurfaceOrFaceSurface"],"fields":{"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcSurfaceCurve":{"domain":"ifcgeometryresource","superclasses":["IfcCurve","IfcCurveOnSurface"],"fields":{"Curve3D":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"AssociatedGeometry":{"type":"IfcPcurve","reference":true,"many":true,"inverse":false},"MasterRepresentation":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSurfaceCurveSweptAreaSolid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSweptAreaSolid"],"fields":{"Directrix":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"StartParam":{"type":"double","reference":false,"many":false,"inverse":false},"StartParamAsString":{"type":"string","reference":false,"many":false,"inverse":false},"EndParam":{"type":"double","reference":false,"many":false,"inverse":false},"EndParamAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ReferenceSurface":{"type":"IfcSurface","reference":true,"many":false,"inverse":false}}},"IfcSurfaceFeature":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcFeatureElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSurfaceOfLinearExtrusion":{"domain":"ifcgeometryresource","superclasses":["IfcSweptSurface"],"fields":{"ExtrudedDirection":{"type":"IfcDirection","reference":true,"many":false,"inverse":false},"Depth":{"type":"double","reference":false,"many":false,"inverse":false},"DepthAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSurfaceOfRevolution":{"domain":"ifcgeometryresource","superclasses":["IfcSweptSurface"],"fields":{"AxisPosition":{"type":"IfcAxis1Placement","reference":true,"many":false,"inverse":false}}},"IfcSurfaceReinforcementArea":{"domain":"ifcstructuralloadresource","superclasses":["IfcStructuralLoadOrResult"],"fields":{"SurfaceReinforcement1":{"type":"double","reference":false,"many":true,"inverse":false},"SurfaceReinforcement1AsString":{"type":"string","reference":false,"many":true,"inverse":false},"SurfaceReinforcement2":{"type":"double","reference":false,"many":true,"inverse":false},"SurfaceReinforcement2AsString":{"type":"string","reference":false,"many":true,"inverse":false},"ShearReinforcement":{"type":"double","reference":false,"many":false,"inverse":false},"ShearReinforcementAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSurfaceStyle":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationStyle","IfcPresentationStyleSelect"],"fields":{"Side":{"type":"enum","reference":false,"many":false,"inverse":false},"Styles":{"type":"IfcSurfaceStyleElementSelect","reference":true,"many":true,"inverse":false}}},"IfcSurfaceStyleLighting":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem","IfcSurfaceStyleElementSelect"],"fields":{"DiffuseTransmissionColour":{"type":"IfcColourRgb","reference":true,"many":false,"inverse":false},"DiffuseReflectionColour":{"type":"IfcColourRgb","reference":true,"many":false,"inverse":false},"TransmissionColour":{"type":"IfcColourRgb","reference":true,"many":false,"inverse":false},"ReflectanceColour":{"type":"IfcColourRgb","reference":true,"many":false,"inverse":false}}},"IfcSurfaceStyleRefraction":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem","IfcSurfaceStyleElementSelect"],"fields":{"RefractionIndex":{"type":"double","reference":false,"many":false,"inverse":false},"RefractionIndexAsString":{"type":"string","reference":false,"many":false,"inverse":false},"DispersionFactor":{"type":"double","reference":false,"many":false,"inverse":false},"DispersionFactorAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSurfaceStyleRendering":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcSurfaceStyleShading"],"fields":{"DiffuseColour":{"type":"IfcColourOrFactor","reference":true,"many":false,"inverse":false},"TransmissionColour":{"type":"IfcColourOrFactor","reference":true,"many":false,"inverse":false},"DiffuseTransmissionColour":{"type":"IfcColourOrFactor","reference":true,"many":false,"inverse":false},"ReflectionColour":{"type":"IfcColourOrFactor","reference":true,"many":false,"inverse":false},"SpecularColour":{"type":"IfcColourOrFactor","reference":true,"many":false,"inverse":false},"SpecularHighlight":{"type":"IfcSpecularHighlightSelect","reference":true,"many":false,"inverse":false},"ReflectanceMethod":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSurfaceStyleShading":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem","IfcSurfaceStyleElementSelect"],"fields":{"SurfaceColour":{"type":"IfcColourRgb","reference":true,"many":false,"inverse":false},"Transparency":{"type":"double","reference":false,"many":false,"inverse":false},"TransparencyAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSurfaceStyleWithTextures":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem","IfcSurfaceStyleElementSelect"],"fields":{"Textures":{"type":"IfcSurfaceTexture","reference":true,"many":true,"inverse":true}}},"IfcSurfaceTexture":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"RepeatS":{"type":"enum","reference":false,"many":false,"inverse":false},"RepeatT":{"type":"enum","reference":false,"many":false,"inverse":false},"Mode":{"type":"string","reference":false,"many":false,"inverse":false},"TextureTransform":{"type":"IfcCartesianTransformationOperator2D","reference":true,"many":false,"inverse":false},"Parameter":{"type":"string","reference":false,"many":true,"inverse":false},"IsMappedBy":{"type":"IfcTextureCoordinate","reference":true,"many":true,"inverse":true},"UsedInStyles":{"type":"IfcSurfaceStyleWithTextures","reference":true,"many":true,"inverse":true}}},"IfcSweptAreaSolid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSolidModel"],"fields":{"SweptArea":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":false},"Position":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false}}},"IfcSweptDiskSolid":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSolidModel"],"fields":{"Directrix":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"Radius":{"type":"double","reference":false,"many":false,"inverse":false},"RadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"InnerRadius":{"type":"double","reference":false,"many":false,"inverse":false},"InnerRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"StartParam":{"type":"double","reference":false,"many":false,"inverse":false},"StartParamAsString":{"type":"string","reference":false,"many":false,"inverse":false},"EndParam":{"type":"double","reference":false,"many":false,"inverse":false},"EndParamAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSweptDiskSolidPolygonal":{"domain":"ifcgeometricmodelresource","superclasses":["IfcSweptDiskSolid"],"fields":{"FilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"FilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSweptSurface":{"domain":"ifcgeometryresource","superclasses":["IfcSurface"],"fields":{"SweptCurve":{"type":"IfcProfileDef","reference":true,"many":false,"inverse":false},"Position":{"type":"IfcAxis2Placement3D","reference":true,"many":false,"inverse":false}}},"IfcSwitchingDevice":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowController"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSwitchingDeviceType":{"domain":"ifcelectricaldomain","superclasses":["IfcFlowControllerType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSystem":{"domain":"ifcproductextension","superclasses":["IfcGroup"],"fields":{"ServicesBuildings":{"type":"IfcRelServicesBuildings","reference":true,"many":true,"inverse":true}}},"IfcSystemFurnitureElement":{"domain":"ifcsharedfacilitieselements","superclasses":["IfcFurnishingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcSystemFurnitureElementType":{"domain":"ifcsharedfacilitieselements","superclasses":["IfcFurnishingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTShapeProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"Depth":{"type":"double","reference":false,"many":false,"inverse":false},"DepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeWidth":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WebThickness":{"type":"double","reference":false,"many":false,"inverse":false},"WebThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeThickness":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"FilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeEdgeRadius":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeEdgeRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WebEdgeRadius":{"type":"double","reference":false,"many":false,"inverse":false},"WebEdgeRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WebSlope":{"type":"double","reference":false,"many":false,"inverse":false},"WebSlopeAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeSlope":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeSlopeAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTable":{"domain":"ifcutilityresource","superclasses":["IfcMetricValueSelect","IfcObjectReferenceSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Rows":{"type":"IfcTableRow","reference":true,"many":true,"inverse":false},"Columns":{"type":"IfcTableColumn","reference":true,"many":true,"inverse":false},"NumberOfCellsInRow":{"type":"long","reference":false,"many":false,"inverse":false},"NumberOfDataRows":{"type":"long","reference":false,"many":false,"inverse":false},"NumberOfHeadings":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcTableColumn":{"domain":"ifcutilityresource","superclasses":[],"fields":{"Identifier":{"type":"string","reference":false,"many":false,"inverse":false},"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"Unit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false},"ReferencePath":{"type":"IfcReference","reference":true,"many":false,"inverse":false}}},"IfcTableRow":{"domain":"ifcutilityresource","superclasses":[],"fields":{"RowCells":{"type":"IfcValue","reference":true,"many":true,"inverse":false},"IsHeading":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTank":{"domain":"ifchvacdomain","superclasses":["IfcFlowStorageDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTankType":{"domain":"ifchvacdomain","superclasses":["IfcFlowStorageDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTask":{"domain":"ifcprocessextension","superclasses":["IfcProcess"],"fields":{"Status":{"type":"string","reference":false,"many":false,"inverse":false},"WorkMethod":{"type":"string","reference":false,"many":false,"inverse":false},"IsMilestone":{"type":"enum","reference":false,"many":false,"inverse":false},"Priority":{"type":"long","reference":false,"many":false,"inverse":false},"TaskTime":{"type":"IfcTaskTime","reference":true,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTaskTime":{"domain":"ifcdatetimeresource","superclasses":["IfcSchedulingTime"],"fields":{"DurationType":{"type":"enum","reference":false,"many":false,"inverse":false},"ScheduleDuration":{"type":"string","reference":false,"many":false,"inverse":false},"ScheduleStart":{"type":"string","reference":false,"many":false,"inverse":false},"ScheduleFinish":{"type":"string","reference":false,"many":false,"inverse":false},"EarlyStart":{"type":"string","reference":false,"many":false,"inverse":false},"EarlyFinish":{"type":"string","reference":false,"many":false,"inverse":false},"LateStart":{"type":"string","reference":false,"many":false,"inverse":false},"LateFinish":{"type":"string","reference":false,"many":false,"inverse":false},"FreeFloat":{"type":"string","reference":false,"many":false,"inverse":false},"TotalFloat":{"type":"string","reference":false,"many":false,"inverse":false},"IsCritical":{"type":"enum","reference":false,"many":false,"inverse":false},"StatusTime":{"type":"string","reference":false,"many":false,"inverse":false},"ActualDuration":{"type":"string","reference":false,"many":false,"inverse":false},"ActualStart":{"type":"string","reference":false,"many":false,"inverse":false},"ActualFinish":{"type":"string","reference":false,"many":false,"inverse":false},"RemainingTime":{"type":"string","reference":false,"many":false,"inverse":false},"Completion":{"type":"double","reference":false,"many":false,"inverse":false},"CompletionAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTaskTimeRecurring":{"domain":"ifcdatetimeresource","superclasses":["IfcTaskTime"],"fields":{"Recurrence":{"type":"IfcRecurrencePattern","reference":true,"many":false,"inverse":false}}},"IfcTaskType":{"domain":"ifcprocessextension","superclasses":["IfcTypeProcess"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"WorkMethod":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTelecomAddress":{"domain":"ifcactorresource","superclasses":["IfcAddress"],"fields":{"TelephoneNumbers":{"type":"string","reference":false,"many":true,"inverse":false},"FacsimileNumbers":{"type":"string","reference":false,"many":true,"inverse":false},"PagerNumber":{"type":"string","reference":false,"many":false,"inverse":false},"ElectronicMailAddresses":{"type":"string","reference":false,"many":true,"inverse":false},"WWWHomePageURL":{"type":"string","reference":false,"many":false,"inverse":false},"MessagingIDs":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcTendon":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcReinforcingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"NominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"NominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"CrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TensionForce":{"type":"double","reference":false,"many":false,"inverse":false},"TensionForceAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PreStress":{"type":"double","reference":false,"many":false,"inverse":false},"PreStressAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FrictionCoefficient":{"type":"double","reference":false,"many":false,"inverse":false},"FrictionCoefficientAsString":{"type":"string","reference":false,"many":false,"inverse":false},"AnchorageSlip":{"type":"double","reference":false,"many":false,"inverse":false},"AnchorageSlipAsString":{"type":"string","reference":false,"many":false,"inverse":false},"MinCurvatureRadius":{"type":"double","reference":false,"many":false,"inverse":false},"MinCurvatureRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTendonAnchor":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcReinforcingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTendonAnchorType":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcReinforcingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTendonType":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcReinforcingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"NominalDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"NominalDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false},"CrossSectionArea":{"type":"double","reference":false,"many":false,"inverse":false},"CrossSectionAreaAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SheathDiameter":{"type":"double","reference":false,"many":false,"inverse":false},"SheathDiameterAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTessellatedFaceSet":{"domain":"ifcgeometricmodelresource","superclasses":["IfcTessellatedItem","IfcBooleanOperand"],"fields":{"Coordinates":{"type":"IfcCartesianPointList3D","reference":true,"many":false,"inverse":false},"HasColours":{"type":"IfcIndexedColourMap","reference":true,"many":true,"inverse":true},"HasTextures":{"type":"IfcIndexedTextureMap","reference":true,"many":true,"inverse":true},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcTessellatedItem":{"domain":"ifcgeometricmodelresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{}},"IfcTextLiteral":{"domain":"ifcpresentationdefinitionresource","superclasses":["IfcGeometricRepresentationItem"],"fields":{"Literal":{"type":"string","reference":false,"many":false,"inverse":false},"Placement":{"type":"IfcAxis2Placement","reference":true,"many":false,"inverse":false},"Path":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTextLiteralWithExtent":{"domain":"ifcpresentationdefinitionresource","superclasses":["IfcTextLiteral"],"fields":{"Extent":{"type":"IfcPlanarExtent","reference":true,"many":false,"inverse":false},"BoxAlignment":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTextStyle":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationStyle","IfcPresentationStyleSelect"],"fields":{"TextCharacterAppearance":{"type":"IfcTextStyleForDefinedFont","reference":true,"many":false,"inverse":false},"TextStyle":{"type":"IfcTextStyleTextModel","reference":true,"many":false,"inverse":false},"TextFontStyle":{"type":"IfcTextFontSelect","reference":true,"many":false,"inverse":false},"ModelOrDraughting":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTextStyleFontModel":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPreDefinedTextFont"],"fields":{"FontFamily":{"type":"string","reference":false,"many":true,"inverse":false},"FontStyle":{"type":"string","reference":false,"many":false,"inverse":false},"FontVariant":{"type":"string","reference":false,"many":false,"inverse":false},"FontWeight":{"type":"string","reference":false,"many":false,"inverse":false},"FontSize":{"type":"IfcSizeSelect","reference":true,"many":false,"inverse":false}}},"IfcTextStyleForDefinedFont":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"Colour":{"type":"IfcColour","reference":true,"many":false,"inverse":false},"BackgroundColour":{"type":"IfcColour","reference":true,"many":false,"inverse":false}}},"IfcTextStyleTextModel":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"TextIndent":{"type":"IfcSizeSelect","reference":true,"many":false,"inverse":false},"TextAlign":{"type":"string","reference":false,"many":false,"inverse":false},"TextDecoration":{"type":"string","reference":false,"many":false,"inverse":false},"LetterSpacing":{"type":"IfcSizeSelect","reference":true,"many":false,"inverse":false},"WordSpacing":{"type":"IfcSizeSelect","reference":true,"many":false,"inverse":false},"TextTransform":{"type":"string","reference":false,"many":false,"inverse":false},"LineHeight":{"type":"IfcSizeSelect","reference":true,"many":false,"inverse":false}}},"IfcTextureCoordinate":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"Maps":{"type":"IfcSurfaceTexture","reference":true,"many":true,"inverse":true}}},"IfcTextureCoordinateGenerator":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcTextureCoordinate"],"fields":{"Mode":{"type":"string","reference":false,"many":false,"inverse":false},"Parameter":{"type":"double","reference":false,"many":true,"inverse":false},"ParameterAsString":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcTextureMap":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcTextureCoordinate"],"fields":{"Vertices":{"type":"IfcTextureVertex","reference":true,"many":true,"inverse":false},"MappedTo":{"type":"IfcFace","reference":true,"many":false,"inverse":true}}},"IfcTextureVertex":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"Coordinates":{"type":"double","reference":false,"many":true,"inverse":false},"CoordinatesAsString":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcTextureVertexList":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationItem"],"fields":{"TexCoordsList":{"type":"ListOfIfcParameterValue","reference":true,"many":true,"inverse":false}}},"IfcTimePeriod":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{"StartTime":{"type":"string","reference":false,"many":false,"inverse":false},"EndTime":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTimeSeries":{"domain":"ifcdatetimeresource","superclasses":["IfcMetricValueSelect","IfcObjectReferenceSelect","IfcResourceObjectSelect"],"fields":{"Name":{"type":"string","reference":false,"many":false,"inverse":false},"Description":{"type":"string","reference":false,"many":false,"inverse":false},"StartTime":{"type":"string","reference":false,"many":false,"inverse":false},"EndTime":{"type":"string","reference":false,"many":false,"inverse":false},"TimeSeriesDataType":{"type":"enum","reference":false,"many":false,"inverse":false},"DataOrigin":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedDataOrigin":{"type":"string","reference":false,"many":false,"inverse":false},"Unit":{"type":"IfcUnit","reference":true,"many":false,"inverse":false},"HasExternalReference":{"type":"IfcExternalReferenceRelationship","reference":true,"many":true,"inverse":true}}},"IfcTimeSeriesValue":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{"ListValues":{"type":"IfcValue","reference":true,"many":true,"inverse":false}}},"IfcTopologicalRepresentationItem":{"domain":"ifctopologyresource","superclasses":["IfcRepresentationItem"],"fields":{}},"IfcTopologyRepresentation":{"domain":"ifcrepresentationresource","superclasses":["IfcShapeModel"],"fields":{}},"IfcToroidalSurface":{"domain":"ifcgeometryresource","superclasses":["IfcElementarySurface"],"fields":{"MajorRadius":{"type":"double","reference":false,"many":false,"inverse":false},"MajorRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"MinorRadius":{"type":"double","reference":false,"many":false,"inverse":false},"MinorRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTransformer":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTransformerType":{"domain":"ifcelectricaldomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTransportElement":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTransportElementType":{"domain":"ifcproductextension","superclasses":["IfcElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTrapeziumProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"BottomXDim":{"type":"double","reference":false,"many":false,"inverse":false},"BottomXDimAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TopXDim":{"type":"double","reference":false,"many":false,"inverse":false},"TopXDimAsString":{"type":"string","reference":false,"many":false,"inverse":false},"YDim":{"type":"double","reference":false,"many":false,"inverse":false},"YDimAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TopXOffset":{"type":"double","reference":false,"many":false,"inverse":false},"TopXOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTriangulatedFaceSet":{"domain":"ifcgeometricmodelresource","superclasses":["IfcTessellatedFaceSet"],"fields":{"Normals":{"type":"ListOfIfcParameterValue","reference":true,"many":true,"inverse":false},"Closed":{"type":"enum","reference":false,"many":false,"inverse":false},"CoordIndex":{"type":"ListOfELong","reference":true,"many":true,"inverse":false},"PnIndex":{"type":"long","reference":false,"many":true,"inverse":false},"NumberOfTriangles":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcTrimmedCurve":{"domain":"ifcgeometryresource","superclasses":["IfcBoundedCurve"],"fields":{"BasisCurve":{"type":"IfcCurve","reference":true,"many":false,"inverse":false},"Trim1":{"type":"IfcTrimmingSelect","reference":true,"many":true,"inverse":false},"Trim2":{"type":"IfcTrimmingSelect","reference":true,"many":true,"inverse":false},"SenseAgreement":{"type":"enum","reference":false,"many":false,"inverse":false},"MasterRepresentation":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTubeBundle":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTubeBundleType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcTypeObject":{"domain":"ifckernel","superclasses":["IfcObjectDefinition"],"fields":{"ApplicableOccurrence":{"type":"string","reference":false,"many":false,"inverse":false},"HasPropertySets":{"type":"IfcPropertySetDefinition","reference":true,"many":true,"inverse":true},"Types":{"type":"IfcRelDefinesByType","reference":true,"many":true,"inverse":true}}},"IfcTypeProcess":{"domain":"ifckernel","superclasses":["IfcTypeObject","IfcProcessSelect"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"LongDescription":{"type":"string","reference":false,"many":false,"inverse":false},"ProcessType":{"type":"string","reference":false,"many":false,"inverse":false},"OperatesOn":{"type":"IfcRelAssignsToProcess","reference":true,"many":true,"inverse":true}}},"IfcTypeProduct":{"domain":"ifckernel","superclasses":["IfcTypeObject","IfcProductSelect"],"fields":{"RepresentationMaps":{"type":"IfcRepresentationMap","reference":true,"many":true,"inverse":false},"Tag":{"type":"string","reference":false,"many":false,"inverse":false},"ReferencedBy":{"type":"IfcRelAssignsToProduct","reference":true,"many":true,"inverse":true}}},"IfcTypeResource":{"domain":"ifckernel","superclasses":["IfcTypeObject","IfcResourceSelect"],"fields":{"Identification":{"type":"string","reference":false,"many":false,"inverse":false},"LongDescription":{"type":"string","reference":false,"many":false,"inverse":false},"ResourceType":{"type":"string","reference":false,"many":false,"inverse":false},"ResourceOf":{"type":"IfcRelAssignsToResource","reference":true,"many":true,"inverse":true}}},"IfcUShapeProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"Depth":{"type":"double","reference":false,"many":false,"inverse":false},"DepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeWidth":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WebThickness":{"type":"double","reference":false,"many":false,"inverse":false},"WebThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeThickness":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"FilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"EdgeRadius":{"type":"double","reference":false,"many":false,"inverse":false},"EdgeRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeSlope":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeSlopeAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcUnitAssignment":{"domain":"ifcmeasureresource","superclasses":[],"fields":{"Units":{"type":"IfcUnit","reference":true,"many":true,"inverse":false}}},"IfcUnitaryControlElement":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcUnitaryControlElementType":{"domain":"ifcbuildingcontrolsdomain","superclasses":["IfcDistributionControlElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcUnitaryEquipment":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDevice"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcUnitaryEquipmentType":{"domain":"ifchvacdomain","superclasses":["IfcEnergyConversionDeviceType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcValve":{"domain":"ifchvacdomain","superclasses":["IfcFlowController"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcValveType":{"domain":"ifchvacdomain","superclasses":["IfcFlowControllerType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcVector":{"domain":"ifcgeometryresource","superclasses":["IfcGeometricRepresentationItem","IfcHatchLineDistanceSelect","IfcVectorOrDirection"],"fields":{"Orientation":{"type":"IfcDirection","reference":true,"many":false,"inverse":false},"Magnitude":{"type":"double","reference":false,"many":false,"inverse":false},"MagnitudeAsString":{"type":"string","reference":false,"many":false,"inverse":false},"Dim":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcVertex":{"domain":"ifctopologyresource","superclasses":["IfcTopologicalRepresentationItem"],"fields":{}},"IfcVertexLoop":{"domain":"ifctopologyresource","superclasses":["IfcLoop"],"fields":{"LoopVertex":{"type":"IfcVertex","reference":true,"many":false,"inverse":false}}},"IfcVertexPoint":{"domain":"ifctopologyresource","superclasses":["IfcVertex","IfcPointOrVertexPoint"],"fields":{"VertexGeometry":{"type":"IfcPoint","reference":true,"many":false,"inverse":false}}},"IfcVibrationIsolator":{"domain":"ifchvacdomain","superclasses":["IfcElementComponent"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcVibrationIsolatorType":{"domain":"ifchvacdomain","superclasses":["IfcElementComponentType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcVirtualElement":{"domain":"ifcproductextension","superclasses":["IfcElement"],"fields":{}},"IfcVirtualGridIntersection":{"domain":"ifcgeometricconstraintresource","superclasses":["IfcGridPlacementDirectionSelect"],"fields":{"IntersectingAxes":{"type":"IfcGridAxis","reference":true,"many":true,"inverse":true},"OffsetDistances":{"type":"double","reference":false,"many":true,"inverse":false},"OffsetDistancesAsString":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcVoidingFeature":{"domain":"ifcstructuralelementsdomain","superclasses":["IfcFeatureElementSubtraction"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWall":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWallElementedCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcWall"],"fields":{}},"IfcWallStandardCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcWall"],"fields":{}},"IfcWallType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWasteTerminal":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTerminal"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWasteTerminalType":{"domain":"ifcplumbingfireprotectiondomain","superclasses":["IfcFlowTerminalType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWindow":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElement"],"fields":{"OverallHeight":{"type":"double","reference":false,"many":false,"inverse":false},"OverallHeightAsString":{"type":"string","reference":false,"many":false,"inverse":false},"OverallWidth":{"type":"double","reference":false,"many":false,"inverse":false},"OverallWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"PartitioningType":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedPartitioningType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcWindowLiningProperties":{"domain":"ifcarchitecturedomain","superclasses":["IfcPreDefinedPropertySet"],"fields":{"LiningDepth":{"type":"double","reference":false,"many":false,"inverse":false},"LiningDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LiningThickness":{"type":"double","reference":false,"many":false,"inverse":false},"LiningThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"TransomThickness":{"type":"double","reference":false,"many":false,"inverse":false},"TransomThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"MullionThickness":{"type":"double","reference":false,"many":false,"inverse":false},"MullionThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FirstTransomOffset":{"type":"double","reference":false,"many":false,"inverse":false},"FirstTransomOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SecondTransomOffset":{"type":"double","reference":false,"many":false,"inverse":false},"SecondTransomOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FirstMullionOffset":{"type":"double","reference":false,"many":false,"inverse":false},"FirstMullionOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false},"SecondMullionOffset":{"type":"double","reference":false,"many":false,"inverse":false},"SecondMullionOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ShapeAspectStyle":{"type":"IfcShapeAspect","reference":true,"many":false,"inverse":false},"LiningOffset":{"type":"double","reference":false,"many":false,"inverse":false},"LiningOffsetAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LiningToPanelOffsetX":{"type":"double","reference":false,"many":false,"inverse":false},"LiningToPanelOffsetXAsString":{"type":"string","reference":false,"many":false,"inverse":false},"LiningToPanelOffsetY":{"type":"double","reference":false,"many":false,"inverse":false},"LiningToPanelOffsetYAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcWindowPanelProperties":{"domain":"ifcarchitecturedomain","superclasses":["IfcPreDefinedPropertySet"],"fields":{"OperationType":{"type":"enum","reference":false,"many":false,"inverse":false},"PanelPosition":{"type":"enum","reference":false,"many":false,"inverse":false},"FrameDepth":{"type":"double","reference":false,"many":false,"inverse":false},"FrameDepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FrameThickness":{"type":"double","reference":false,"many":false,"inverse":false},"FrameThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"ShapeAspectStyle":{"type":"IfcShapeAspect","reference":true,"many":false,"inverse":false}}},"IfcWindowStandardCase":{"domain":"ifcsharedbldgelements","superclasses":["IfcWindow"],"fields":{}},"IfcWindowStyle":{"domain":"ifcarchitecturedomain","superclasses":["IfcTypeProduct"],"fields":{"ConstructionType":{"type":"enum","reference":false,"many":false,"inverse":false},"OperationType":{"type":"enum","reference":false,"many":false,"inverse":false},"ParameterTakesPrecedence":{"type":"enum","reference":false,"many":false,"inverse":false},"Sizeable":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWindowType":{"domain":"ifcsharedbldgelements","superclasses":["IfcBuildingElementType"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false},"PartitioningType":{"type":"enum","reference":false,"many":false,"inverse":false},"ParameterTakesPrecedence":{"type":"enum","reference":false,"many":false,"inverse":false},"UserDefinedPartitioningType":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcWorkCalendar":{"domain":"ifcprocessextension","superclasses":["IfcControl"],"fields":{"WorkingTimes":{"type":"IfcWorkTime","reference":true,"many":true,"inverse":false},"ExceptionTimes":{"type":"IfcWorkTime","reference":true,"many":true,"inverse":false},"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWorkControl":{"domain":"ifcprocessextension","superclasses":["IfcControl"],"fields":{"CreationDate":{"type":"string","reference":false,"many":false,"inverse":false},"Creators":{"type":"IfcPerson","reference":true,"many":true,"inverse":false},"Purpose":{"type":"string","reference":false,"many":false,"inverse":false},"Duration":{"type":"string","reference":false,"many":false,"inverse":false},"TotalFloat":{"type":"string","reference":false,"many":false,"inverse":false},"StartTime":{"type":"string","reference":false,"many":false,"inverse":false},"FinishTime":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcWorkPlan":{"domain":"ifcprocessextension","superclasses":["IfcWorkControl"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWorkSchedule":{"domain":"ifcprocessextension","superclasses":["IfcWorkControl"],"fields":{"PredefinedType":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcWorkTime":{"domain":"ifcdatetimeresource","superclasses":["IfcSchedulingTime"],"fields":{"RecurrencePattern":{"type":"IfcRecurrencePattern","reference":true,"many":false,"inverse":false},"Start":{"type":"string","reference":false,"many":false,"inverse":false},"Finish":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcZShapeProfileDef":{"domain":"ifcprofileresource","superclasses":["IfcParameterizedProfileDef"],"fields":{"Depth":{"type":"double","reference":false,"many":false,"inverse":false},"DepthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeWidth":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeWidthAsString":{"type":"string","reference":false,"many":false,"inverse":false},"WebThickness":{"type":"double","reference":false,"many":false,"inverse":false},"WebThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FlangeThickness":{"type":"double","reference":false,"many":false,"inverse":false},"FlangeThicknessAsString":{"type":"string","reference":false,"many":false,"inverse":false},"FilletRadius":{"type":"double","reference":false,"many":false,"inverse":false},"FilletRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false},"EdgeRadius":{"type":"double","reference":false,"many":false,"inverse":false},"EdgeRadiusAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcZone":{"domain":"ifcproductextension","superclasses":["IfcSystem"],"fields":{"LongName":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcStrippedOptional":{"domain":null,"superclasses":[],"fields":{"wrappedValue":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcAbsorbedDoseMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcAccelerationMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcAmountOfSubstanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcAngularVelocityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcAreaDensityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcAreaMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcBinary":{"domain":"ifcmeasureresource","superclasses":[],"fields":{"wrappedValue":{"type":"bytearray","reference":false,"many":false,"inverse":false}}},"IfcBoolean":{"domain":"ifcmeasureresource","superclasses":["IfcModulusOfRotationalSubgradeReactionSelect","IfcModulusOfSubgradeReactionSelect","IfcModulusOfTranslationalSubgradeReactionSelect","IfcRotationalStiffnessSelect","IfcSimpleValue","IfcTranslationalStiffnessSelect","IfcWarpingStiffnessSelect","IfcValue"],"fields":{"wrappedValue":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcCardinalPointReference":{"domain":"ifcmaterialresource","superclasses":[],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcContextDependentMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCountMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcCurvatureMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDate":{"domain":"ifcdatetimeresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDateTime":{"domain":"ifcdatetimeresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDayInMonthNumber":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcDayInWeekNumber":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcDescriptiveMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue","IfcSizeSelect"],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDimensionCount":{"domain":"ifcgeometryresource","superclasses":[],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcDoseEquivalentMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDuration":{"domain":"ifcdatetimeresource","superclasses":["IfcSimpleValue","IfcTimeOrRatioSelect"],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcDynamicViscosityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcElectricCapacitanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcElectricChargeMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcElectricConductanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcElectricCurrentMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcElectricResistanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcElectricVoltageMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcEnergyMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcFontStyle":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcFontVariant":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcFontWeight":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcForceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcFrequencyMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcGloballyUniqueId":{"domain":"ifcutilityresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcHeatFluxDensityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcHeatingValueMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcIdentifier":{"domain":"ifcmeasureresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcIlluminanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcInductanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcInteger":{"domain":"ifcmeasureresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcIntegerCountRateMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcIonConcentrationMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcIsothermalMoistureCapacityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcKinematicViscosityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLabel":{"domain":"ifcmeasureresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLengthMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcBendingParameterSelect","IfcMeasureValue","IfcSizeSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLinearForceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLinearMomentMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLinearStiffnessMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue","IfcTranslationalStiffnessSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLinearVelocityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLogical":{"domain":"ifcmeasureresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcLuminousFluxMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLuminousIntensityDistributionMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcLuminousIntensityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMagneticFluxDensityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMagneticFluxMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMassDensityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMassFlowRateMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMassMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMassPerLengthMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcModulusOfElasticityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcModulusOfLinearSubgradeReactionMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue","IfcModulusOfTranslationalSubgradeReactionSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcModulusOfRotationalSubgradeReactionMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue","IfcModulusOfRotationalSubgradeReactionSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcModulusOfSubgradeReactionMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue","IfcModulusOfSubgradeReactionSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMoistureDiffusivityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMolecularWeightMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMomentOfInertiaMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMonetaryMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcMonthInYearNumber":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcNumericMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPHMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcParameterValue":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue","IfcTrimmingSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPlanarForceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPlaneAngleMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcBendingParameterSelect","IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPowerMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPresentableText":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcPressureMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRadioActivityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRatioMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue","IfcSizeSelect","IfcTimeOrRatioSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcReal":{"domain":"ifcmeasureresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRotationalFrequencyMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRotationalMassMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcRotationalStiffnessMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue","IfcRotationalStiffnessSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSectionModulusMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSectionalAreaIntegralMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcShearModulusMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSolidAngleMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSoundPowerLevelMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSoundPowerMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSoundPressureLevelMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSoundPressureMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSpecificHeatCapacityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSpecularExponent":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcSpecularHighlightSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcSpecularRoughness":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcSpecularHighlightSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTemperatureGradientMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTemperatureRateOfChangeMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcText":{"domain":"ifcmeasureresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTextAlignment":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTextDecoration":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTextFontName":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTextTransformation":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcThermalAdmittanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcThermalConductivityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcThermalExpansionCoefficientMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcThermalResistanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcThermalTransmittanceMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcThermodynamicTemperatureMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTime":{"domain":"ifcdatetimeresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTimeMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcTimeStamp":{"domain":"ifcdatetimeresource","superclasses":["IfcSimpleValue"],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcTorqueMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcURIReference":{"domain":"ifcexternalreferenceresource","superclasses":[],"fields":{"wrappedValue":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcVaporPermeabilityMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcVolumeMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcVolumetricFlowRateMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcWarpingConstantMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcWarpingMomentMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue","IfcWarpingStiffnessSelect"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":false,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":false,"inverse":false}}},"IfcBoxAlignment":{"domain":"ifcpresentationdefinitionresource","superclasses":["IfcLabel"],"fields":{}},"IfcCompoundPlaneAngleMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcDerivedMeasureValue"],"fields":{"wrappedValue":{"type":"long","reference":false,"many":false,"inverse":false}}},"IfcLanguageId":{"domain":"ifcexternalreferenceresource","superclasses":["IfcIdentifier"],"fields":{}},"IfcNonNegativeLengthMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcLengthMeasure","IfcMeasureValue"],"fields":{}},"IfcNormalisedRatioMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcRatioMeasure","IfcColourOrFactor","IfcMeasureValue","IfcSizeSelect"],"fields":{}},"IfcPositiveInteger":{"domain":"ifcmeasureresource","superclasses":["IfcInteger"],"fields":{}},"IfcPositiveLengthMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcLengthMeasure","IfcHatchLineDistanceSelect","IfcMeasureValue","IfcSizeSelect"],"fields":{}},"IfcPositivePlaneAngleMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcPlaneAngleMeasure","IfcMeasureValue"],"fields":{}},"IfcPositiveRatioMeasure":{"domain":"ifcmeasureresource","superclasses":["IfcRatioMeasure","IfcMeasureValue","IfcSizeSelect"],"fields":{}},"IfcActionRequestTypeEnum":{},"IfcActionSourceTypeEnum":{},"IfcActionTypeEnum":{},"IfcActuatorTypeEnum":{},"IfcAddressTypeEnum":{},"IfcAirTerminalBoxTypeEnum":{},"IfcAirTerminalTypeEnum":{},"IfcAirToAirHeatRecoveryTypeEnum":{},"IfcAlarmTypeEnum":{},"IfcAnalysisModelTypeEnum":{},"IfcAnalysisTheoryTypeEnum":{},"IfcArithmeticOperatorEnum":{},"IfcAssemblyPlaceEnum":{},"IfcAudioVisualApplianceTypeEnum":{},"IfcBSplineCurveForm":{},"IfcBSplineSurfaceForm":{},"IfcBeamTypeEnum":{},"IfcBenchmarkEnum":{},"IfcBoilerTypeEnum":{},"IfcBooleanOperator":{},"IfcBuildingElementPartTypeEnum":{},"IfcBuildingElementProxyTypeEnum":{},"IfcBuildingSystemTypeEnum":{},"IfcBurnerTypeEnum":{},"IfcCableCarrierFittingTypeEnum":{},"IfcCableCarrierSegmentTypeEnum":{},"IfcCableFittingTypeEnum":{},"IfcCableSegmentTypeEnum":{},"IfcChangeActionEnum":{},"IfcChillerTypeEnum":{},"IfcChimneyTypeEnum":{},"IfcCoilTypeEnum":{},"IfcColumnTypeEnum":{},"IfcCommunicationsApplianceTypeEnum":{},"IfcComplexPropertyTemplateTypeEnum":{},"IfcCompressorTypeEnum":{},"IfcCondenserTypeEnum":{},"IfcConnectionTypeEnum":{},"IfcConstraintEnum":{},"IfcConstructionEquipmentResourceTypeEnum":{},"IfcConstructionMaterialResourceTypeEnum":{},"IfcConstructionProductResourceTypeEnum":{},"IfcControllerTypeEnum":{},"IfcCooledBeamTypeEnum":{},"IfcCoolingTowerTypeEnum":{},"IfcCostItemTypeEnum":{},"IfcCostScheduleTypeEnum":{},"IfcCoveringTypeEnum":{},"IfcCrewResourceTypeEnum":{},"IfcCurtainWallTypeEnum":{},"IfcCurveInterpolationEnum":{},"IfcDamperTypeEnum":{},"IfcDataOriginEnum":{},"IfcDerivedUnitEnum":{},"IfcDirectionSenseEnum":{},"IfcDiscreteAccessoryTypeEnum":{},"IfcDistributionChamberElementTypeEnum":{},"IfcDistributionPortTypeEnum":{},"IfcDistributionSystemEnum":{},"IfcDocumentConfidentialityEnum":{},"IfcDocumentStatusEnum":{},"IfcDoorPanelOperationEnum":{},"IfcDoorPanelPositionEnum":{},"IfcDoorStyleConstructionEnum":{},"IfcDoorStyleOperationEnum":{},"IfcDoorTypeEnum":{},"IfcDoorTypeOperationEnum":{},"IfcDuctFittingTypeEnum":{},"IfcDuctSegmentTypeEnum":{},"IfcDuctSilencerTypeEnum":{},"IfcElectricApplianceTypeEnum":{},"IfcElectricDistributionBoardTypeEnum":{},"IfcElectricFlowStorageDeviceTypeEnum":{},"IfcElectricGeneratorTypeEnum":{},"IfcElectricMotorTypeEnum":{},"IfcElectricTimeControlTypeEnum":{},"IfcElementAssemblyTypeEnum":{},"IfcElementCompositionEnum":{},"IfcEngineTypeEnum":{},"IfcEvaporativeCoolerTypeEnum":{},"IfcEvaporatorTypeEnum":{},"IfcEventTriggerTypeEnum":{},"IfcEventTypeEnum":{},"IfcExternalSpatialElementTypeEnum":{},"IfcFanTypeEnum":{},"IfcFastenerTypeEnum":{},"IfcFilterTypeEnum":{},"IfcFireSuppressionTerminalTypeEnum":{},"IfcFlowDirectionEnum":{},"IfcFlowInstrumentTypeEnum":{},"IfcFlowMeterTypeEnum":{},"IfcFootingTypeEnum":{},"IfcFurnitureTypeEnum":{},"IfcGeographicElementTypeEnum":{},"IfcGeometricProjectionEnum":{},"IfcGlobalOrLocalEnum":{},"IfcGridTypeEnum":{},"IfcHeatExchangerTypeEnum":{},"IfcHumidifierTypeEnum":{},"IfcInterceptorTypeEnum":{},"IfcInternalOrExternalEnum":{},"IfcInventoryTypeEnum":{},"IfcJunctionBoxTypeEnum":{},"IfcKnotType":{},"IfcLaborResourceTypeEnum":{},"IfcLampTypeEnum":{},"IfcLayerSetDirectionEnum":{},"IfcLightDistributionCurveEnum":{},"IfcLightEmissionSourceEnum":{},"IfcLightFixtureTypeEnum":{},"IfcLoadGroupTypeEnum":{},"IfcLogicalOperatorEnum":{},"IfcMechanicalFastenerTypeEnum":{},"IfcMedicalDeviceTypeEnum":{},"IfcMemberTypeEnum":{},"IfcMotorConnectionTypeEnum":{},"IfcNullStyleEnum":{},"IfcObjectTypeEnum":{},"IfcObjectiveEnum":{},"IfcOccupantTypeEnum":{},"IfcOpeningElementTypeEnum":{},"IfcOutletTypeEnum":{},"IfcPerformanceHistoryTypeEnum":{},"IfcPermeableCoveringOperationEnum":{},"IfcPermitTypeEnum":{},"IfcPhysicalOrVirtualEnum":{},"IfcPileConstructionEnum":{},"IfcPileTypeEnum":{},"IfcPipeFittingTypeEnum":{},"IfcPipeSegmentTypeEnum":{},"IfcPlateTypeEnum":{},"IfcPreferredSurfaceCurveRepresentation":{},"IfcProcedureTypeEnum":{},"IfcProfileTypeEnum":{},"IfcProjectOrderTypeEnum":{},"IfcProjectedOrTrueLengthEnum":{},"IfcProjectionElementTypeEnum":{},"IfcPropertySetTemplateTypeEnum":{},"IfcProtectiveDeviceTrippingUnitTypeEnum":{},"IfcProtectiveDeviceTypeEnum":{},"IfcPumpTypeEnum":{},"IfcRailingTypeEnum":{},"IfcRampFlightTypeEnum":{},"IfcRampTypeEnum":{},"IfcRecurrenceTypeEnum":{},"IfcReflectanceMethodEnum":{},"IfcReinforcingBarRoleEnum":{},"IfcReinforcingBarSurfaceEnum":{},"IfcReinforcingBarTypeEnum":{},"IfcReinforcingMeshTypeEnum":{},"IfcRoleEnum":{},"IfcRoofTypeEnum":{},"IfcSIPrefix":{},"IfcSIUnitName":{},"IfcSanitaryTerminalTypeEnum":{},"IfcSectionTypeEnum":{},"IfcSensorTypeEnum":{},"IfcSequenceEnum":{},"IfcShadingDeviceTypeEnum":{},"IfcSimplePropertyTemplateTypeEnum":{},"IfcSlabTypeEnum":{},"IfcSolarDeviceTypeEnum":{},"IfcSpaceHeaterTypeEnum":{},"IfcSpaceTypeEnum":{},"IfcSpatialZoneTypeEnum":{},"IfcStackTerminalTypeEnum":{},"IfcStairFlightTypeEnum":{},"IfcStairTypeEnum":{},"IfcStateEnum":{},"IfcStructuralCurveActivityTypeEnum":{},"IfcStructuralCurveMemberTypeEnum":{},"IfcStructuralSurfaceActivityTypeEnum":{},"IfcStructuralSurfaceMemberTypeEnum":{},"IfcSubContractResourceTypeEnum":{},"IfcSurfaceFeatureTypeEnum":{},"IfcSurfaceSide":{},"IfcSwitchingDeviceTypeEnum":{},"IfcSystemFurnitureElementTypeEnum":{},"IfcTankTypeEnum":{},"IfcTaskDurationEnum":{},"IfcTaskTypeEnum":{},"IfcTendonAnchorTypeEnum":{},"IfcTendonTypeEnum":{},"IfcTextPath":{},"IfcTimeSeriesDataTypeEnum":{},"IfcTransformerTypeEnum":{},"IfcTransitionCode":{},"IfcTransportElementTypeEnum":{},"IfcTrimmingPreference":{},"IfcTubeBundleTypeEnum":{},"IfcUnitEnum":{},"IfcUnitaryControlElementTypeEnum":{},"IfcUnitaryEquipmentTypeEnum":{},"IfcValveTypeEnum":{},"IfcVibrationIsolatorTypeEnum":{},"IfcVoidingFeatureTypeEnum":{},"IfcWallTypeEnum":{},"IfcWasteTerminalTypeEnum":{},"IfcWindowPanelOperationEnum":{},"IfcWindowPanelPositionEnum":{},"IfcWindowStyleConstructionEnum":{},"IfcWindowStyleOperationEnum":{},"IfcWindowTypeEnum":{},"IfcWindowTypePartitioningEnum":{},"IfcWorkCalendarTypeEnum":{},"IfcWorkPlanTypeEnum":{},"IfcWorkScheduleTypeEnum":{},"IfcComplexNumber":{"domain":"ifcmeasureresource","superclasses":["IfcMeasureValue"],"fields":{"wrappedValue":{"type":"double","reference":false,"many":true,"inverse":false},"wrappedValueAsString":{"type":"string","reference":false,"many":true,"inverse":false}}},"IfcNullStyle":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcPresentationStyleSelect"],"fields":{"wrappedValue":{"type":"enum","reference":false,"many":false,"inverse":false}}},"IfcActorSelect":{"domain":"ifcactorresource","superclasses":[],"fields":{}},"IfcAppliedValueSelect":{"domain":"ifccostresource","superclasses":[],"fields":{}},"IfcAxis2Placement":{"domain":"ifcgeometryresource","superclasses":[],"fields":{}},"IfcBendingParameterSelect":{"domain":"ifcstructuralelementsdomain","superclasses":[],"fields":{}},"IfcBooleanOperand":{"domain":"ifcgeometricmodelresource","superclasses":[],"fields":{}},"IfcClassificationReferenceSelect":{"domain":"ifcexternalreferenceresource","superclasses":[],"fields":{}},"IfcClassificationSelect":{"domain":"ifcexternalreferenceresource","superclasses":[],"fields":{}},"IfcColour":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcFillStyleSelect"],"fields":{}},"IfcColourOrFactor":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcCoordinateReferenceSystemSelect":{"domain":"ifcrepresentationresource","superclasses":[],"fields":{}},"IfcCsgSelect":{"domain":"ifcgeometricmodelresource","superclasses":[],"fields":{}},"IfcCurveFontOrScaledCurveFontSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcCurveOnSurface":{"domain":"ifcgeometryresource","superclasses":[],"fields":{}},"IfcCurveOrEdgeCurve":{"domain":"ifcgeometricconstraintresource","superclasses":[],"fields":{}},"IfcCurveStyleFontSelect":{"domain":"ifcpresentationappearanceresource","superclasses":["IfcCurveFontOrScaledCurveFontSelect"],"fields":{}},"IfcDefinitionSelect":{"domain":"ifckernel","superclasses":[],"fields":{}},"IfcDerivedMeasureValue":{"domain":"ifcmeasureresource","superclasses":["IfcValue"],"fields":{}},"IfcDocumentSelect":{"domain":"ifcexternalreferenceresource","superclasses":[],"fields":{}},"IfcFillStyleSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcGeometricSetSelect":{"domain":"ifcgeometricmodelresource","superclasses":[],"fields":{}},"IfcGridPlacementDirectionSelect":{"domain":"ifcgeometricconstraintresource","superclasses":[],"fields":{}},"IfcHatchLineDistanceSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcLayeredItem":{"domain":"ifcpresentationorganizationresource","superclasses":[],"fields":{}},"IfcLibrarySelect":{"domain":"ifcexternalreferenceresource","superclasses":[],"fields":{}},"IfcLightDistributionDataSourceSelect":{"domain":"ifcpresentationorganizationresource","superclasses":[],"fields":{}},"IfcMaterialSelect":{"domain":"ifcmaterialresource","superclasses":[],"fields":{}},"IfcMeasureValue":{"domain":"ifcmeasureresource","superclasses":["IfcValue"],"fields":{}},"IfcMetricValueSelect":{"domain":"ifcconstraintresource","superclasses":[],"fields":{}},"IfcModulusOfRotationalSubgradeReactionSelect":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{}},"IfcModulusOfSubgradeReactionSelect":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{}},"IfcModulusOfTranslationalSubgradeReactionSelect":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{}},"IfcObjectReferenceSelect":{"domain":"ifcpropertyresource","superclasses":[],"fields":{}},"IfcPointOrVertexPoint":{"domain":"ifcgeometricconstraintresource","superclasses":[],"fields":{}},"IfcPresentationStyleSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcProcessSelect":{"domain":"ifckernel","superclasses":[],"fields":{}},"IfcProductRepresentationSelect":{"domain":"ifcrepresentationresource","superclasses":[],"fields":{}},"IfcProductSelect":{"domain":"ifckernel","superclasses":[],"fields":{}},"IfcPropertySetDefinitionSelect":{"domain":"ifckernel","superclasses":[],"fields":{}},"IfcResourceObjectSelect":{"domain":"ifcexternalreferenceresource","superclasses":[],"fields":{}},"IfcResourceSelect":{"domain":"ifckernel","superclasses":[],"fields":{}},"IfcRotationalStiffnessSelect":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{}},"IfcSegmentIndexSelect":{"domain":"ifcgeometryresource","superclasses":[],"fields":{}},"IfcShell":{"domain":"ifctopologyresource","superclasses":[],"fields":{}},"IfcSimpleValue":{"domain":"ifcmeasureresource","superclasses":["IfcValue"],"fields":{}},"IfcSizeSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcSolidOrShell":{"domain":"ifcgeometricconstraintresource","superclasses":[],"fields":{}},"IfcSpaceBoundarySelect":{"domain":"ifcproductextension","superclasses":[],"fields":{}},"IfcSpecularHighlightSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcStructuralActivityAssignmentSelect":{"domain":"ifcstructuralanalysisdomain","superclasses":[],"fields":{}},"IfcStyleAssignmentSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcSurfaceOrFaceSurface":{"domain":"ifcgeometricconstraintresource","superclasses":[],"fields":{}},"IfcSurfaceStyleElementSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcTextFontSelect":{"domain":"ifcpresentationappearanceresource","superclasses":[],"fields":{}},"IfcTimeOrRatioSelect":{"domain":"ifcdatetimeresource","superclasses":[],"fields":{}},"IfcTranslationalStiffnessSelect":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{}},"IfcTrimmingSelect":{"domain":"ifcgeometryresource","superclasses":[],"fields":{}},"IfcUnit":{"domain":"ifcmeasureresource","superclasses":[],"fields":{}},"IfcValue":{"domain":"ifcmeasureresource","superclasses":["IfcAppliedValueSelect","IfcMetricValueSelect"],"fields":{}},"IfcVectorOrDirection":{"domain":"ifcgeometryresource","superclasses":[],"fields":{}},"IfcWarpingStiffnessSelect":{"domain":"ifcstructuralloadresource","superclasses":[],"fields":{}},"ListOfIfcCartesianPoint":{"domain":null,"superclasses":[],"fields":{"List":{"type":"IfcCartesianPoint","reference":true,"many":true,"inverse":false}}},"ListOfIfcLengthMeasure":{"domain":null,"superclasses":[],"fields":{"List":{"type":"IfcLengthMeasure","reference":true,"many":true,"inverse":false}}},"ListOfIfcNormalisedRatioMeasure":{"domain":null,"superclasses":[],"fields":{"List":{"type":"IfcNormalisedRatioMeasure","reference":true,"many":true,"inverse":false}}},"ListOfELong":{"domain":null,"superclasses":[],"fields":{"List":{"type":"long","reference":false,"many":true,"inverse":false}}},"ListOfEDouble":{"domain":null,"superclasses":[],"fields":{"List":{"type":"double","reference":false,"many":true,"inverse":false}}},"ListOfIfcParameterValue":{"domain":null,"superclasses":[],"fields":{"List":{"type":"IfcParameterValue","reference":true,"many":true,"inverse":false}}}}};

var Model = function () {
	function Model(bimServerApi, poid, roid, schema) {
		classCallCheck(this, Model);

		this.schema = schema;
		this.bimServerApi = bimServerApi;
		this.poid = poid;
		this.roid = roid;
		this.waiters = [];

		this.objects = {};
		this.objectsByGuid = {};
		this.objectsByName = {};

		this.oidsFetching = {};
		this.guidsFetching = {};
		this.namesFetching = {};

		// Those are only fully loaded types (all of them), should not be stored here if loaded partially
		this.loadedTypes = [];
		this.loadedDeep = false;
		this.changedObjectOids = {};
		this.loading = false;
		this.logging = true;

		this.changes = 0;
		this.changeListeners = [];
	}

	createClass(Model, [{
		key: "init",
		value: function init(callback) {
			callback();
		}
	}, {
		key: "load",
		value: function load(deep, modelLoadCallback) {
			var othis = this;

			if (deep) {
				this.loading = true;
				this.bimServerApi.getJsonStreamingSerializer(function (serializer) {
					othis.bimServerApi.call("ServiceInterface", "download", {
						roids: [othis.roid],
						serializerOid: serializer.oid,
						sync: false
					}, function (topicId) {
						var url = othis.bimServerApi.generateRevisionDownloadUrl({
							topicId: topicId,
							serializerOid: serializer.oid
						});
						othis.bimServerApi.getJson(url, null, function (data) {
							data.objects.forEach(function (object) {
								othis.objects[object._i] = othis.createWrapper(object, object._t);
							});
							othis.loading = false;
							othis.loadedDeep = true;
							othis.waiters.forEach(function (waiter) {
								waiter();
							});
							othis.waiters = [];
							othis.bimServerApi.call("ServiceInterface", "cleanupLongAction", {
								topicId: topicId
							}, function () {
								if (modelLoadCallback != null) {
									modelLoadCallback(othis);
								}
							});
						}, function (error) {
							console.log(error);
						});
					});
				});
			} else {
				if (modelLoadCallback != null) {
					modelLoadCallback(othis);
				}
			}
		}

		// Start a transaction, make sure to wait for the callback to be called, only after that the transaction will be active

	}, {
		key: "startTransaction",
		value: function startTransaction(callback) {
			var _this = this;

			this.bimServerApi.call("LowLevelInterface", "startTransaction", {
				poid: this.poid
			}, function (tid) {
				_this.tid = tid;
				callback(tid);
			});
		}

		// Checks whether a transaction is running, if not, it throws an exception, otherwise it return the tid

	}, {
		key: "checkTransaction",
		value: function checkTransaction() {
			if (this.tid != null) {
				return this.tid;
			}
			throw new Error("No transaction is running, call startTransaction first");
		}
	}, {
		key: "create",
		value: function create(className, object, callback) {
			var _this2 = this;

			var tid = this.checkTransaction();
			object._t = className;
			var wrapper = this.createWrapper({}, className);
			this.bimServerApi.call("LowLevelInterface", "createObject", {
				tid: tid,
				className: className
			}, function (oid) {
				wrapper._i = oid;
				_this2.objects[object._i] = wrapper;
				object._s = 1;
				if (callback != null) {
					callback(object);
				}
			});
			return object;
		}
	}, {
		key: "reset",
		value: function reset() {}
	}, {
		key: "commit",
		value: function commit(comment, callback) {
			var tid = this.checkTransaction();
			this.bimServerApi.call("LowLevelInterface", "commitTransaction", {
				tid: tid,
				comment: comment
			}, function (roid) {
				if (callback != null) {
					callback(roid);
				}
			});
		}
	}, {
		key: "abort",
		value: function abort(callback) {
			var tid = this.checkTransaction();
			this.bimServerApi.call("LowLevelInterface", "abortTransaction", {
				tid: tid
			}, function () {
				if (callback != null) {
					callback();
				}
			});
		}
	}, {
		key: "addChangeListener",
		value: function addChangeListener(changeListener) {
			this.changeListeners.push(changeListener);
		}
	}, {
		key: "incrementChanges",
		value: function incrementChanges() {
			var _this3 = this;

			this.changes++;
			this.changeListeners.forEach(function (changeListener) {
				changeListener(_this3.changes);
			});
		}
	}, {
		key: "extendClass",
		value: function extendClass(wrapperClass, typeName) {
			var _this4 = this;

			var realType = this.bimServerApi.schemas[this.schema][typeName];
			if (typeName === "GeometryInfo" || typeName === "GeometryData") {
				realType = this.bimServerApi.schemas.geometry[typeName];
			}
			realType.superclasses.forEach(function (typeName) {
				_this4.extendClass(wrapperClass, typeName);
			});

			var othis = this;

			for (var fieldName in realType.fields) {
				var field = realType.fields[fieldName];
				field.name = fieldName;
				wrapperClass.fields.push(field);
				(function (field, fieldName) {
					if (field.reference) {
						wrapperClass["set" + fieldName.firstUpper() + "Wrapped"] = function (typeName, value) {
							var object = this.object;
							object[fieldName] = {
								_t: typeName,
								value: value
							};
							var tid = othis.checkTransaction();
							var type = othis.bimServerApi.schemas[othis.schema][typeName];
							var wrappedValueType = type.fields.wrappedValue;
							if (wrappedValueType.type === "string") {
								othis.bimServerApi.call("LowLevelInterface", "setWrappedStringAttribute", {
									tid: tid,
									oid: object._i,
									attributeName: fieldName,
									type: typeName,
									value: value
								}, function () {
									if (object.changedFields == null) {
										object.changedFields = {};
									}
									object.changedFields[fieldName] = true;
									othis.changedObjectOids[object.oid] = true;
									othis.incrementChanges();
								});
							}
						};
						wrapperClass["set" + fieldName.firstUpper()] = function (value) {
							var tid = othis.checkTransaction();
							var object = this.object;
							object[fieldName] = value;
							if (value == null) {
								othis.bimServerApi.call("LowLevelInterface", "unsetReference", {
									tid: tid,
									oid: object._i,
									referenceName: fieldName
								}, function () {
									if (object.changedFields == null) {
										object.changedFields = {};
									}
									object.changedFields[fieldName] = true;
									othis.changedObjectOids[object.oid] = true;
								});
							} else {
								othis.bimServerApi.call("LowLevelInterface", "setReference", {
									tid: tid,
									oid: object._i,
									referenceName: fieldName,
									referenceOid: value._i
								}, function () {
									if (object.changedFields == null) {
										object.changedFields = {};
									}
									object.changedFields[fieldName] = true;
									othis.changedObjectOids[object.oid] = true;
								});
							}
						};
						wrapperClass["add" + fieldName.firstUpper()] = function (value, callback) {
							var object = this.object;
							var tid = othis.checkTransaction();
							if (object[fieldName] == null) {
								object[fieldName] = [];
							}
							object[fieldName].push(value);
							othis.bimServerApi.call("LowLevelInterface", "addReference", {
								tid: tid,
								oid: object._i,
								referenceName: fieldName,
								referenceOid: value._i
							}, function () {
								if (object.changedFields == null) {
									object.changedFields = {};
								}
								object.changedFields[fieldName] = true;
								othis.changedObjectOids[object.oid] = true;
								if (callback != null) {
									callback();
								}
							});
						};
						wrapperClass["remove" + fieldName.firstUpper()] = function (value, callback) {
							var object = this.object;
							var tid = othis.checkTransaction();
							var list = object[fieldName];
							var index = list.indexOf(value);
							list.splice(index, 1);

							othis.bimServerApi.call("LowLevelInterface", "removeReference", {
								tid: tid,
								oid: object._i,
								referenceName: fieldName,
								index: index
							}, function () {
								if (object.changedFields == null) {
									object.changedFields = {};
								}
								object.changedFields[fieldName] = true;
								othis.changedObjectOids[object.oid] = true;
								if (callback != null) {
									callback();
								}
							});
						};
						wrapperClass["get" + fieldName.firstUpper()] = function (callback) {
							var object = this.object;
							var model = this.model;
							var promise = new BimServerApiPromise();
							if (object[fieldName] != null) {
								if (field.many) {
									object[fieldName].forEach(function (item, index) {
										callback(item, index);
									});
								} else {
									callback(object[fieldName]);
								}
								promise.fire();
								return promise;
							}
							var embValue = object["_e" + fieldName];
							if (embValue != null) {
								if (callback != null) {
									callback(embValue);
								}
								promise.fire();
								return promise;
							}
							var value = object["_r" + fieldName];
							if (field.many) {
								if (object[fieldName] == null) {
									object[fieldName] = [];
								}
								if (value != null) {
									model.get(value, function (v) {
										object[fieldName].push(v);
										callback(v, object[fieldName].length - 1);
									}).done(function () {
										promise.fire();
									});
								} else {
									promise.fire();
								}
							} else {
								if (value != null) {
									var ref = othis.objects[value._i];
									if (value._i == -1) {
										callback(null);
										promise.fire();
									} else if (ref == null || ref.object._s == 0) {
										model.get(value._i, function (v) {
											object[fieldName] = v;
											callback(v);
										}).done(function () {
											promise.fire();
										});
									} else {
										object[fieldName] = ref;
										callback(ref);
										promise.fire();
									}
								} else {
									callback(null);
									promise.fire();
								}
							}
							return promise;
						};
					} else {
						wrapperClass["get" + fieldName.firstUpper()] = function (callback) {
							var object = this.object;
							if (field.many) {
								if (object[fieldName] == null) {
									object[fieldName] = [];
								}
								//							object[fieldName].push = function () {};
							}
							if (callback != null) {
								callback(object[fieldName]);
							}
							return object[fieldName];
						};
						wrapperClass["set" + fieldName.firstUpper()] = function (value) {
							var object = this.object;
							object[fieldName] = value;
							var tid = othis.checkTransaction();
							if (field.many) {
								othis.bimServerApi.call("LowLevelInterface", "setDoubleAttributes", {
									tid: tid,
									oid: object._i,
									attributeName: fieldName,
									values: value
								}, function () {});
							} else {
								if (value == null) {
									othis.bimServerApi.call("LowLevelInterface", "unsetAttribute", {
										tid: tid,
										oid: object._i,
										attributeName: fieldName
									}, function () {});
								} else if (field.type === "string") {
									othis.bimServerApi.call("LowLevelInterface", "setStringAttribute", {
										tid: tid,
										oid: object._i,
										attributeName: fieldName,
										value: value
									}, function () {});
								} else if (field.type === "double") {
									othis.bimServerApi.call("LowLevelInterface", "setDoubleAttribute", {
										tid: tid,
										oid: object._i,
										attributeName: fieldName,
										value: value
									}, function () {});
								} else if (field.type === "boolean") {
									othis.bimServerApi.call("LowLevelInterface", "setBooleanAttribute", {
										tid: tid,
										oid: object._i,
										attributeName: fieldName,
										value: value
									}, function () {});
								} else if (field.type === "int") {
									othis.bimServerApi.call("LowLevelInterface", "setIntegerAttribute", {
										tid: tid,
										oid: object._i,
										attributeName: fieldName,
										value: value
									}, function () {});
								} else if (field.type === "enum") {
									othis.bimServerApi.call("LowLevelInterface", "setEnumAttribute", {
										tid: tid,
										oid: object._i,
										attributeName: fieldName,
										value: value
									}, function () {});
								} else {
									othis.bimServerApi.log("Unimplemented type " + (typeof value === "undefined" ? "undefined" : _typeof(value)));
								}
								object[fieldName] = value;
							}
							if (object.changedFields == null) {
								object.changedFields = {};
							}
							object.changedFields[fieldName] = true;
							othis.changedObjectOids[object.oid] = true;
						};
					}
				})(field, fieldName);
			}
		}
	}, {
		key: "dumpByType",
		value: function dumpByType() {
			var mapLoaded = {};
			var mapNotLoaded = {};
			for (var oid in this.objects) {
				var object = this.objects[oid];
				var type = object.getType();
				var counter = mapLoaded[type];
				if (object.object._s == 1) {
					if (counter == null) {
						mapLoaded[type] = 1;
					} else {
						mapLoaded[type] = counter + 1;
					}
				}
				if (object.object._s == 0) {
					var _counter = mapNotLoaded[type];
					if (_counter == null) {
						mapNotLoaded[type] = 1;
					} else {
						mapNotLoaded[type] = _counter + 1;
					}
				}
			}
			console.log("LOADED");
			for (var _type in mapLoaded) {
				console.log(_type, mapLoaded[_type]);
			}
			console.log("NOT_LOADED");
			for (var _type2 in mapNotLoaded) {
				console.log(_type2, mapNotLoaded[_type2]);
			}
		}
	}, {
		key: "getClass",
		value: function getClass(typeName) {
			var othis = this;

			if (this.bimServerApi.classes[typeName] == null) {
				var realType = this.bimServerApi.schemas[this.schema][typeName];
				if (realType == null) {
					if (typeName === "GeometryInfo" || typeName === "GeometryData") {
						realType = this.bimServerApi.schemas.geometry[typeName];
					}
					if (realType == null) {
						throw "Type " + typeName + " not found in schema " + this.schema;
					}
				}

				var wrapperClass = {
					fields: []
				};

				wrapperClass.isA = function (typeName) {
					return othis.bimServerApi.isA(othis.schema, this.object._t, typeName);
				};
				wrapperClass.getType = function () {
					return this.object._t;
				};
				wrapperClass.remove = function (removeCallback) {
					var tid = othis.checkTransaction();
					othis.bimServerApi.call("LowLevelInterface", "removeObject", {
						tid: tid,
						oid: this.object._i
					}, function () {
						if (removeCallback != null) {
							removeCallback();
						}
						delete othis.objects[this.object._i];
					});
				};

				othis.extendClass(wrapperClass, typeName);

				othis.bimServerApi.classes[typeName] = wrapperClass;
			}
			return othis.bimServerApi.classes[typeName];
		}
	}, {
		key: "createWrapper",
		value: function createWrapper(object, typeName) {
			if (this.objects[object._i] != null) {
				console.log("Warning!", object);
			}
			if (typeName == null) {
				console.warn("typeName = null", object);
			}
			object.oid = object._i;
			var cl = this.getClass(typeName);
			if (cl == null) {
				console.error("No class found for " + typeName);
			}
			var wrapper = Object.create(cl);
			// transient variables
			wrapper.trans = {
				mode: 2
			};
			wrapper.oid = object.oid;
			wrapper.model = this;
			wrapper.object = object;
			return wrapper;
		}
	}, {
		key: "size",
		value: function size(callback) {
			this.bimServerApi.call("ServiceInterface", "getRevision", {
				roid: this.roid
			}, function (revision) {
				callback(revision.size);
			});
		}
	}, {
		key: "count",
		value: function count(type, includeAllSubTypes, callback) {
			// TODO use includeAllSubTypes
			this.bimServerApi.call("LowLevelInterface", "count", {
				roid: this.roid,
				className: type
			}, function (size) {
				callback(size);
			});
		}
	}, {
		key: "getByX",
		value: function getByX(methodName, keyname, fetchingMap, targetMap, query, getValueMethod, list, callback) {
			var promise = new BimServerApiPromise();
			if (typeof list == "string" || typeof list == "number") {
				list = [list];
			}
			var len = list.length;
			// Iterating in reverse order because we remove items from this array
			while (len--) {
				var item = list[len];
				if (targetMap[item] != null) {
					// Already loaded? Remove from list and call callback
					var existingObject = targetMap[item].object;
					if (existingObject._s == 1) {
						var index = list.indexOf(item);
						list.splice(index, 1);
						callback(targetMap[item]);
					}
				} else if (fetchingMap[item] != null) {
					// Already loading? Add the callback to the list and remove from fetching list
					fetchingMap[item].push(callback);
					var _index = list.indexOf(item);
					list.splice(_index, 1);
				}
			}

			var othis = this;
			// Any left?
			if (list.length > 0) {
				list.forEach(function (item) {
					fetchingMap[item] = [];
				});
				othis.bimServerApi.getJsonStreamingSerializer(function (serializer) {
					var request = {
						roids: [othis.roid],
						query: JSON.stringify(query),
						serializerOid: serializer.oid,
						sync: false
					};
					othis.bimServerApi.call("ServiceInterface", "download", request, function (topicId) {
						var url = othis.bimServerApi.generateRevisionDownloadUrl({
							topicId: topicId,
							serializerOid: serializer.oid
						});
						othis.bimServerApi.getJson(url, null, function (data) {
							if (data.objects.length > 0) {
								var done = 0;
								data.objects.forEach(function (object) {
									var wrapper = null;
									if (othis.objects[object._i] != null) {
										wrapper = othis.objects[object._i];
										if (wrapper.object._s != 1) {
											wrapper.object = object;
										}
									} else {
										wrapper = othis.createWrapper(object, object._t);
									}
									var item = getValueMethod(object);
									// Checking the value again, because sometimes serializers send more objects...
									if (list.indexOf(item) != -1) {
										targetMap[item] = wrapper;
										if (fetchingMap[item] != null) {
											fetchingMap[item].forEach(function (cb) {
												cb(wrapper);
											});
											delete fetchingMap[item];
										}
										callback(wrapper);
									}
									done++;
									if (done == data.objects.length) {
										othis.bimServerApi.call("ServiceInterface", "cleanupLongAction", {
											topicId: topicId
										}, function () {
											promise.fire();
										});
									}
								});
							} else {
								othis.bimServerApi.log("Object with " + keyname + " " + list + " not found");
								callback(null);
								promise.fire();
							}
						}, function (error) {
							console.log(error);
						});
					});
				});
			} else {
				promise.fire();
			}
			return promise;
		}
	}, {
		key: "getByGuids",
		value: function getByGuids(guids, callback) {
			var query = {
				guids: guids
			};
			return this.getByX("getByGuid", "guid", this.guidsFetching, this.objectsByGuid, query, function (object) {
				return object.GlobalId;
			}, guids, callback);
		}
	}, {
		key: "get",
		value: function get$$1(oids, callback) {
			if (typeof oids == "number") {
				oids = [oids];
			} else if (typeof oids == "string") {
				oids = [parseInt(oids)];
			} else if (Array.isArray(oids)) {
				var newOids = [];
				oids.forEach(function (oid) {
					if ((typeof oid === "undefined" ? "undefined" : _typeof(oid)) == "object") {
						newOids.push(oid._i);
					} else {
						newOids.push(oid);
					}
				});
				oids = newOids;
			}
			var query = {
				oids: oids
			};
			return this.getByX("get", "OID", this.oidsFetching, this.objects, query, function (object) {
				return object._i;
			}, oids, callback);
		}
	}, {
		key: "getByName",
		value: function getByName(names, callback) {
			var query = {
				names: names
			};
			return this.getByX("getByName", "name", this.namesFetching, this.objectsByName, query, function (object) {
				return object.getName == null ? null : object.getName();
			}, names, callback);
		}
	}, {
		key: "query",
		value: function query(_query, callback, errorCallback) {
			var _this5 = this;

			var promise = new BimServerApiPromise();
			var fullTypesLoading = {};
			if (_query.queries != null) {
				_query.queries.forEach(function (subQuery) {
					if (subQuery.type != null) {
						if (_typeof(subQuery.type) === "object") {
							fullTypesLoading[subQuery.type.name] = true;
							_this5.loadedTypes[subQuery.type.name] = {};
							if (subQuery.type.includeAllSubtypes) {
								var schema = _this5.bimServerApi.schemas[_this5.schema];
								_this5.bimServerApi.getAllSubTypes(schema, subQuery.type.name, function (subTypeName) {
									fullTypesLoading[subTypeName] = true;
									_this5.loadedTypes[subTypeName] = {};
								});
							}
						} else {
							fullTypesLoading[subQuery.type] = true;
							_this5.loadedTypes[subQuery.type] = {};
							if (subQuery.includeAllSubtypes) {
								var _schema = _this5.bimServerApi.schemas[_this5.schema];
								_this5.bimServerApi.getAllSubTypes(_schema, subQuery.type, function (subTypeName) {
									fullTypesLoading[subTypeName] = true;
									_this5.loadedTypes[subTypeName] = {};
								});
							}
						}
					}
				});
			}
			this.bimServerApi.getJsonStreamingSerializer(function (serializer) {
				_this5.bimServerApi.callWithFullIndication("ServiceInterface", "download", {
					roids: [_this5.roid],
					query: JSON.stringify(_query),
					serializerOid: serializer.oid,
					sync: false
				}, function (topicId) {
					var handled = false;
					_this5.bimServerApi.registerProgressHandler(topicId, function (topicId, state) {
						if (state.title == "Done preparing" && !handled) {
							handled = true;
							var url = _this5.bimServerApi.generateRevisionDownloadUrl({
								topicId: topicId,
								serializerOid: serializer.oid
							});
							_this5.bimServerApi.notifier.setInfo(_this5.bimServerApi.translate("GETTING_MODEL_DATA"), -1);
							_this5.bimServerApi.getJson(url, null, function (data) {
								//console.log("query", data.objects.length);
								data.objects.forEach(function (object) {
									var wrapper = _this5.objects[object._i];
									if (wrapper == null) {
										wrapper = _this5.createWrapper(object, object._t);
										_this5.objects[object._i] = wrapper;
										if (fullTypesLoading[object._t] != null) {
											_this5.loadedTypes[object._t][wrapper.oid] = wrapper;
										}
									} else {
										if (object._s == 1) {
											wrapper.object = object;
										}
									}
									//										if (othis.loadedTypes[wrapper.getType()] == null) {
									//											othis.loadedTypes[wrapper.getType()] = {};
									//										}
									//										othis.loadedTypes[wrapper.getType()][object._i] = wrapper;
									if (object._s == 1 && callback != null) {
										callback(wrapper);
									}
								});
								//									othis.dumpByType();
								_this5.bimServerApi.call("ServiceInterface", "cleanupLongAction", {
									topicId: topicId
								}, function () {
									promise.fire();
									_this5.bimServerApi.notifier.setSuccess(_this5.bimServerApi.translate("MODEL_DATA_DONE"));
								});
							});
						} else if (state.state == "AS_ERROR") {
							if (errorCallback != null) {
								errorCallback(state.title);
							} else {
								console.error(state.title);
							}
						}
					});
				});
			});
			return promise;
		}
	}, {
		key: "getAllOfType",
		value: function getAllOfType(type, includeAllSubTypes, callback) {
			var _this6 = this;

			var promise = new BimServerApiPromise();
			if (this.loadedDeep) {
				for (var oid in this.objects) {
					var object = this.objects[oid];
					if (object._t == type) {
						callback(object);
					}
				}
				promise.fire();
			} else {
				var types = [];
				types.push(type);
				if (includeAllSubTypes) {
					this.bimServerApi.getAllSubTypes(this.bimServerApi.schemas[this.schema], type, function (subType) {
						types.push(subType);
					});
				}

				var query = {
					queries: []
				};

				types.forEach(function (type) {
					if (_this6.loadedTypes[type] != null) {
						for (var _oid in _this6.loadedTypes[type]) {
							callback(_this6.loadedTypes[type][_oid]);
						}
					} else {
						query.queries.push({
							type: type
						});
					}
				});

				if (query.queries.length > 0) {
					this.bimServerApi.getJsonStreamingSerializer(function (serializer) {
						_this6.bimServerApi.call("ServiceInterface", "download", {
							roids: [_this6.roid],
							query: JSON.stringify(query),
							serializerOid: serializer.oid,
							sync: false
						}, function (topicId) {
							var url = _this6.bimServerApi.generateRevisionDownloadUrl({
								topicId: topicId,
								serializerOid: serializer.oid
							});
							_this6.bimServerApi.getJson(url, null, function (data) {
								if (_this6.loadedTypes[type] == null) {
									_this6.loadedTypes[type] = {};
								}
								data.objects.some(function (object) {
									if (_this6.objects[object._i] != null) {
										// Hmm we are doing a query on type, but some objects have already loaded, let's use those instead
										var wrapper = _this6.objects[object._i];
										if (wrapper.object._s == 1) {
											if (wrapper.isA(type)) {
												_this6.loadedTypes[type][object._i] = wrapper;
												return callback(wrapper);
											}
										} else {
											// Replace the value with something that's LOADED
											wrapper.object = object;
											if (wrapper.isA(type)) {
												_this6.loadedTypes[type][object._i] = wrapper;
												return callback(wrapper);
											}
										}
									} else {
										var _wrapper = _this6.createWrapper(object, object._t);
										_this6.objects[object._i] = _wrapper;
										if (_wrapper.isA(type) && object._s == 1) {
											_this6.loadedTypes[type][object._i] = _wrapper;
											return callback(_wrapper);
										}
									}
								});
								_this6.bimServerApi.call("ServiceInterface", "cleanupLongAction", {
									topicId: topicId
								}, function () {
									promise.fire();
								});
							}, function (error) {
								console.log(error);
							});
						});
					});
				} else {
					promise.fire();
				}
			}
			return promise;
		}
	}]);
	return Model;
}();

var translations = {
	GETDATAOBJECTSBYTYPE_BUSY: "Loading objects",
	REQUESTPASSWORDCHANGE_BUSY: "Busy sending password reset e-mail",
	REQUESTPASSWORDCHANGE_DONE: "A password reset e-mail has been sent",
	SETSERVERSETTINGS_DONE: "Server settings successfully updated",
	ENABLEPLUGIN_DONE: "Plugin successfully enabled",
	DISABLEPLUGIN_DONE: "Plugin successfully disabled",
	SETDEFAULTWEBMODULE_DONE: "Default webmodule changed",
	SETDEFAULTQUERYENGINE_DONE: "Default Query Engine successfully changed",
	SETDEFAULTMODELMERGER_DONE: "Default Model Merger successfully changed",
	SETDEFAULTSERIALIZER_DONE: "Default Serializer successfully changed",
	SETDEFAULTOBJECTIDM_DONE: "Default ObjectIDM successfully changed",
	SETDEFAULTRENDERENGINE_DONE: "Default Render Engine successfully changed",
	SETDEFAULTMODELCOMPARE_DONE: "Default Model Compare successfully changed",
	LOGIN_BUSY: "Trying to login",
	CHANGEUSERTYPE_DONE: "Type of user successfully changed",
	ADDUSER_DONE: "User successfully added, you should receive a validation email shortly",
	UPDATEINTERNALSERVICE_DONE: "Internal service successfully updated",
	UPDATEMODELCOMPARE_DONE: "Model compare plugin successfully updated",
	UPDATEMODELMERGER_DONE: "Model merger successfully updated",
	UPDATEQUERYENGINE_DONE: "Query engine plugin successfully updated",
	UPDATEOBJECTIDM_DONE: "ObjectIDM succesfully updated",
	UPDATEDESERIALIZER_DONE: "Serializer succesfully updated",
	ADDUSERTOPROJECT_DONE: "User successfully added to project",
	REMOVEUSERFROMPROJECT_DONE: "User successfully removed from project",
	UNDELETEPROJECT_DONE: "Project successfully undeleted",
	DELETEPROJECT_DONE: "Project successfully deleted",
	ADDPROJECT_DONE: "Project successfully added",
	VALIDATEACCOUNT_DONE: "Account successfully validated, you can now login",
	ADDPROJECTASSUBPROJECT_DONE: "Sub project added successfully",
	DOWNLOADBYJSONQUERY_BUSY: "Downloading BIM",
	CHECKINFROMURL_DONE: "Done checking in from URL",
	GETLOGGEDINUSER_BUSY: "Getting user details",
	SETPLUGINSETTINGS_DONE: "Plugin settings successfully saved",
	GETSERVERINFO_BUSY: "Getting server info",
	GETVERSION_BUSY: "Getting server version",
	GETPROJECTBYPOID_BUSY: "Getting project details",
	GETALLRELATEDPROJECTS_BUSY: "Getting related project's details",
	GETSERIALIZERBYPLUGINCLASSNAME_BUSY: "Getting serializer info",
	CLEANUPLONGACTION_BUSY: "Cleaning up",
	GETREVISIONSUMMARY_BUSY: "Getting revision summary",
	DOWNLOADBYOIDS_BUSY: "Downloading model data",
	REGISTERPROGRESSHANDLER_BUSY: "Registering for updates on progress",
	GETALLREVISIONSOFPROJECT_BUSY: "Getting all revisions of project",
	GETPLUGINDESCRIPTOR_BUSY: "Getting plugin information",
	GETUSERSETTINGS_BUSY: "Getting user settings",
	GETALLQUERYENGINES_BUSY: "Getting query engines",
	REGISTERNEWPROJECTHANDLER_BUSY: "Registering for updates on new projects",
	ADDUSER_BUSY: "Adding user...",
	GETAVAILABLEPLUGINBUNDLES_BUSY: "Loading available plugins, this can take a while...",
	GETAVAILABLEPLUGINBUNDLES_DONE: "Done loading available plugins",
	GETINSTALLEDPLUGINBUNDLES_BUSY: "Loading installed plugins, this can take a while...",
	GETINSTALLEDPLUGINBUNDLES_DONE: "Done loading installed plugins",
	INSTALLPLUGINBUNDLE_BUSY: "Installing plugin...",
	INSTALLPLUGINBUNDLE_DONE: "Plugin successfully installed",
	GETPLUGININFORMATION_BUSY: "Getting plugin information, this can take a while for large plugins...",
	GETPLUGININFORMATION_DONE: "Plugin information successfully retrieved",
	DOWNLOAD_BUSY: "Downloading model data...",
	DOWNLOAD_DONE: "Model data downloaded",
	LOGIN_DONE: "Login successful",
	LOGOUT_DONE: "Logout successful",
	UPDATEPROJECT_DONE: "Project successfully updated",
	TRIGGERREVISIONSERVICE_BUSY: "Triggering service...",
	TRIGGERREVISIONSERVICE_DONE: "Service triggered successfully",
	INSTALLPLUGINBUNDLEFROMFILE_DONE: "Plugin bundle successfully installed from file",
	CHECKINFROMURL_BUSY: "Checking in from URL...",
	ERROR_REMOTE_METHOD_CALL: "Remote error (server probably down or not reachable)",
	GETTING_MODEL_DATA: "Getting model data...",
	MODEL_DATA_DONE: "Model data successfully downloaded..."
};

//import XMLHttpRequest from 'xhr2';

// Where does this come frome? The API crashes on the absence of this
// member function?
String.prototype.firstUpper = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

var BimServerClient = function () {
	function BimServerClient(baseUrl) {
		var notifier = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
		var translate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
		classCallCheck(this, BimServerClient);

		this.interfaceMapping = {
			"ServiceInterface": "org.bimserver.ServiceInterface",
			"NewServicesInterface": "org.bimserver.NewServicesInterface",
			"AuthInterface": "org.bimserver.AuthInterface",
			"OAuthInterface": "org.bimserver.OAuthInterface",
			"SettingsInterface": "org.bimserver.SettingsInterface",
			"AdminInterface": "org.bimserver.AdminInterface",
			"PluginInterface": "org.bimserver.PluginInterface",
			"MetaInterface": "org.bimserver.MetaInterface",
			"LowLevelInterface": "org.bimserver.LowLevelInterface",
			"NotificationRegistryInterface": "org.bimserver.NotificationRegistryInterface"
		};

		// translate function override
		this.translateOverride = translate;

		// Current BIMserver token
		this.token = null;

		// Base URL of the BIMserver
		this.baseUrl = baseUrl;
		if (this.baseUrl.substring(this.baseUrl.length - 1) == "/") {
			this.baseUrl = this.baseUrl.substring(0, this.baseUrl.length - 1);
		}

		// JSON endpoint on BIMserver
		this.address = this.baseUrl + "/json";

		// Notifier, default implementation does nothing
		this.notifier = notifier;
		if (this.notifier == null) {
			this.notifier = {
				setInfo: function setInfo(message) {
					console.log("[default]", message);
				},
				setSuccess: function setSuccess() {},
				setError: function setError() {},
				resetStatus: function resetStatus() {},
				resetStatusQuick: function resetStatusQuick() {},
				clear: function clear() {}
			};
		}

		// The websocket client
		this.webSocket = new BimServerApiWebSocket(baseUrl, this);
		this.webSocket.listener = this.processNotification.bind(this);

		// Cached user object
		this.user = null;

		this.listeners = {};

		//    	this.autoLoginTried = false;

		// Cache for serializers, PluginClassName(String) -> Serializer
		this.serializersByPluginClassName = [];

		// Whether debugging is enabled, just a lot more logging
		this.debug = false;

		// Mapping from ChannelId -> Listener (function)
		this.binaryDataListener = {};

		// This mapping keeps track of the prototype objects per class, will be lazily popuplated by the getClass method
		this.classes = {};

		// Schema name (String) -> Schema
		this.schemas = {};
	}

	createClass(BimServerClient, [{
		key: 'init',
		value: function init(callback) {
			var _this = this;

			this.call("AdminInterface", "getServerInfo", {}, function (serverInfo) {
				_this.version = serverInfo.version;
				//const versionString = this.version.major + "." + this.version.minor + "." + this.version.revision;

				_this.schemas.geometry = geometry.classes;
				_this.addSubtypesToSchema(_this.schemas.geometry);

				_this.schemas.ifc2x3tc1 = ifc2x3tc1.classes;
				_this.addSubtypesToSchema(_this.schemas.ifc2x3tc1);

				_this.schemas.ifc4 = ifc4.classes;
				_this.addSubtypesToSchema(_this.schemas.ifc4);

				callback(_this, serverInfo);
			});
		}
	}, {
		key: 'addSubtypesToSchema',
		value: function addSubtypesToSchema(classes) {
			var _loop = function _loop(typeName) {
				var type = classes[typeName];
				if (type.superclasses != null) {
					type.superclasses.forEach(function (superClass) {
						var directSubClasses = classes[superClass].directSubClasses;
						if (directSubClasses == null) {
							directSubClasses = [];
							classes[superClass].directSubClasses = directSubClasses;
						}
						directSubClasses.push(typeName);
					});
				}
			};

			for (var typeName in classes) {
				_loop(typeName);
			}
		}
	}, {
		key: 'getAllSubTypes',
		value: function getAllSubTypes(schema, typeName, callback) {
			var _this2 = this;

			var type = schema[typeName];
			if (type.directSubClasses != null) {
				type.directSubClasses.forEach(function (subTypeName) {
					callback(subTypeName);
					_this2.getAllSubTypes(schema, subTypeName, callback);
				});
			}
		}
	}, {
		key: 'log',
		value: function log(message, message2) {
			if (this.debug) {
				console.log(message, message2);
			}
		}
	}, {
		key: 'translate',
		value: function translate(key) {
			if (this.translateOverride !== null) {
				return this.translateOverride(key);
			}
			key = key.toUpperCase();
			if (translations != null) {
				var translated = translations[key];
				if (translated == null) {
					console.warn("translation for " + key + " not found, using key");
					return key;
				}
				return translated;
			}
			this.error("no translations");
			return key;
		}
	}, {
		key: 'login',
		value: function login(username, password, callback, errorCallback, options) {
			var _this3 = this;

			if (options == null) {
				options = {};
			}
			var request = {
				username: username,
				password: password
			};
			this.call("AuthInterface", "login", request, function (data) {
				_this3.token = data;
				if (options.done !== false) {
					_this3.notifier.setInfo(_this3.translate("LOGIN_DONE"), 2000);
				}
				_this3.resolveUser(callback);
			}, errorCallback, options.busy === false ? false : true, options.done === false ? false : true, options.error === false ? false : true);
		}
	}, {
		key: 'downloadViaWebsocket',
		value: function downloadViaWebsocket(msg) {
			msg.action = "download";
			msg.token = this.token;
			this.webSocket.send(msg);
		}
	}, {
		key: 'setBinaryDataListener',
		value: function setBinaryDataListener(topicId, listener) {
			this.binaryDataListener[topicId] = listener;
		}
	}, {
		key: 'processNotification',
		value: function processNotification(message) {
			if (message instanceof ArrayBuffer) {
				var view = new DataView(message, 0, 8);
				var topicId = view.getUint32(0, true) + 0x100000000 * view.getUint32(4, true); // TopicId's are of type long (64 bit)
				var listener = this.binaryDataListener[topicId];
				if (listener != null) {
					listener(message);
				} else {
					console.error("No listener for topicId", topicId);
				}
			} else {
				var intf = message["interface"];
				if (this.listeners[intf] != null) {
					if (this.listeners[intf][message.method] != null) {
						var ar = null;
						this.listeners[intf][message.method].forEach(function (listener) {
							if (ar == null) {
								// Only parse the arguments once, or when there are no listeners, not even once
								ar = [];
								var i = 0;
								for (var key in message.parameters) {
									ar[i++] = message.parameters[key];
								}
							}
							listener.apply(null, ar);
						});
					} else {
						console.log("No listeners on interface " + intf + " for method " + message.method);
					}
				} else {
					console.log("No listeners for interface " + intf);
				}
			}
		}
	}, {
		key: 'resolveUser',
		value: function resolveUser(callback) {
			var _this4 = this;

			this.call("AuthInterface", "getLoggedInUser", {}, function (data) {
				_this4.user = data;
				if (callback != null) {
					callback(_this4.user);
				}
			});
		}
	}, {
		key: 'logout',
		value: function logout(callback) {
			var _this5 = this;

			this.call("AuthInterface", "logout", {}, function () {
				_this5.notifier.setInfo(_this5.translate("LOGOUT_DONE"));
				callback();
			});
		}
	}, {
		key: 'generateRevisionDownloadUrl',
		value: function generateRevisionDownloadUrl(settings) {
			return this.baseUrl + "/download?token=" + this.token + (settings.zip ? "&zip=on" : "") + "&topicId=" + settings.topicId;
		}
	}, {
		key: 'generateExtendedDataDownloadUrl',
		value: function generateExtendedDataDownloadUrl(edid) {
			return this.baseUrl + "/download?token=" + this.token + "&action=extendeddata&edid=" + edid;
		}
	}, {
		key: 'getJsonSerializer',
		value: function getJsonSerializer(callback) {
			this.getSerializerByPluginClassName("org.bimserver.serializers.JsonSerializerPlugin", callback);
		}
	}, {
		key: 'getJsonStreamingSerializer',
		value: function getJsonStreamingSerializer(callback) {
			this.getSerializerByPluginClassName("org.bimserver.serializers.JsonStreamingSerializerPlugin", callback);
		}
	}, {
		key: 'getSerializerByPluginClassName',
		value: function getSerializerByPluginClassName(pluginClassName, callback) {
			var _this6 = this;

			if (this.serializersByPluginClassName[pluginClassName] == null) {
				this.call("PluginInterface", "getSerializerByPluginClassName", {
					pluginClassName: pluginClassName
				}, function (serializer) {
					_this6.serializersByPluginClassName[pluginClassName] = serializer;
					callback(serializer);
				});
			} else {
				callback(this.serializersByPluginClassName[pluginClassName]);
			}
		}
	}, {
		key: 'getMessagingSerializerByPluginClassName',
		value: function getMessagingSerializerByPluginClassName(pluginClassName, callback) {
			var _this7 = this;

			if (this.serializersByPluginClassName[pluginClassName] == null) {
				this.call("PluginInterface", "getMessagingSerializerByPluginClassName", {
					pluginClassName: pluginClassName
				}, function (serializer) {
					_this7.serializersByPluginClassName[pluginClassName] = serializer;
					callback(serializer);
				});
			} else {
				callback(this.serializersByPluginClassName[pluginClassName]);
			}
		}
	}, {
		key: 'register',
		value: function register(interfaceName, methodName, callback, registerCallback) {
			if (callback == null) {
				throw "Cannot register null callback";
			}
			if (this.listeners[interfaceName] == null) {
				this.listeners[interfaceName] = {};
			}
			if (this.listeners[interfaceName][methodName] == null) {
				this.listeners[interfaceName][methodName] = [];
			}
			this.listeners[interfaceName][methodName].push(callback);
			if (registerCallback != null) {
				registerCallback();
			}
		}
	}, {
		key: 'registerNewRevisionOnSpecificProjectHandler',
		value: function registerNewRevisionOnSpecificProjectHandler(poid, handler, callback) {
			var _this8 = this;

			this.register("NotificationInterface", "newRevision", handler, function () {
				_this8.call("NotificationRegistryInterface", "registerNewRevisionOnSpecificProjectHandler", {
					endPointId: _this8.webSocket.endPointId,
					poid: poid
				}, function () {
					if (callback != null) {
						callback();
					}
				});
			});
		}
	}, {
		key: 'registerNewExtendedDataOnRevisionHandler',
		value: function registerNewExtendedDataOnRevisionHandler(roid, handler, callback) {
			var _this9 = this;

			this.register("NotificationInterface", "newExtendedData", handler, function () {
				_this9.call("NotificationRegistryInterface", "registerNewExtendedDataOnRevisionHandler", {
					endPointId: _this9.webSocket.endPointId,
					roid: roid
				}, function () {
					if (callback != null) {
						callback();
					}
				});
			});
		}
	}, {
		key: 'registerNewUserHandler',
		value: function registerNewUserHandler(handler, callback) {
			var _this10 = this;

			this.register("NotificationInterface", "newUser", handler, function () {
				_this10.call("NotificationRegistryInterface", "registerNewUserHandler", {
					endPointId: _this10.webSocket.endPointId
				}, function () {
					if (callback != null) {
						callback();
					}
				});
			});
		}
	}, {
		key: 'unregisterNewUserHandler',
		value: function unregisterNewUserHandler(handler, callback) {
			this.unregister(handler);
			this.call("NotificationRegistryInterface", "unregisterNewUserHandler", {
				endPointId: this.webSocket.endPointId
			}, function () {
				if (callback != null) {
					callback();
				}
			});
		}
	}, {
		key: 'unregisterChangeProgressProjectHandler',
		value: function unregisterChangeProgressProjectHandler(poid, newHandler, closedHandler, callback) {
			this.unregister(newHandler);
			this.unregister(closedHandler);
			this.call("NotificationRegistryInterface", "unregisterChangeProgressOnProject", {
				poid: poid,
				endPointId: this.webSocket.endPointId
			}, callback);
		}
	}, {
		key: 'registerChangeProgressProjectHandler',
		value: function registerChangeProgressProjectHandler(poid, newHandler, closedHandler, callback) {
			var _this11 = this;

			this.register("NotificationInterface", "newProgressOnProjectTopic", newHandler, function () {
				_this11.register("NotificationInterface", "closedProgressOnProjectTopic", closedHandler, function () {
					_this11.call("NotificationRegistryInterface", "registerChangeProgressOnProject", {
						poid: poid,
						endPointId: _this11.webSocket.endPointId
					}, function () {
						if (callback != null) {
							callback();
						}
					});
				});
			});
		}
	}, {
		key: 'unregisterChangeProgressServerHandler',
		value: function unregisterChangeProgressServerHandler(newHandler, closedHandler, callback) {
			this.unregister(newHandler);
			this.unregister(closedHandler);
			if (this.webSocket.endPointId != null) {
				this.call("NotificationRegistryInterface", "unregisterChangeProgressOnServer", {
					endPointId: this.webSocket.endPointId
				}, callback);
			}
		}
	}, {
		key: 'registerChangeProgressServerHandler',
		value: function registerChangeProgressServerHandler(newHandler, closedHandler, callback) {
			var _this12 = this;

			this.register("NotificationInterface", "newProgressOnServerTopic", newHandler, function () {
				_this12.register("NotificationInterface", "closedProgressOnServerTopic", closedHandler, function () {
					_this12.call("NotificationRegistryInterface", "registerChangeProgressOnServer", {
						endPointId: _this12.webSocket.endPointId
					}, function () {
						if (callback != null) {
							callback();
						}
					});
				});
			});
		}
	}, {
		key: 'unregisterChangeProgressRevisionHandler',
		value: function unregisterChangeProgressRevisionHandler(roid, newHandler, closedHandler, callback) {
			this.unregister(newHandler);
			this.unregister(closedHandler);
			this.call("NotificationRegistryInterface", "unregisterChangeProgressOnProject", {
				roid: roid,
				endPointId: this.webSocket.endPointId
			}, callback);
		}
	}, {
		key: 'registerChangeProgressRevisionHandler',
		value: function registerChangeProgressRevisionHandler(poid, roid, newHandler, closedHandler, callback) {
			var _this13 = this;

			this.register("NotificationInterface", "newProgressOnRevisionTopic", newHandler, function () {
				_this13.register("NotificationInterface", "closedProgressOnRevisionTopic", closedHandler, function () {
					_this13.call("NotificationRegistryInterface", "registerChangeProgressOnRevision", {
						poid: poid,
						roid: roid,
						endPointId: _this13.webSocket.endPointId
					}, function () {
						if (callback != null) {
							callback();
						}
					});
				});
			});
		}
	}, {
		key: 'registerNewProjectHandler',
		value: function registerNewProjectHandler(handler, callback) {
			var _this14 = this;

			this.register("NotificationInterface", "newProject", handler, function () {
				_this14.call("NotificationRegistryInterface", "registerNewProjectHandler", {
					endPointId: _this14.webSocket.endPointId
				}, function () {
					if (callback != null) {
						callback();
					}
				});
			});
		}
	}, {
		key: 'unregisterNewProjectHandler',
		value: function unregisterNewProjectHandler(handler, callback) {
			this.unregister(handler);
			if (this.webSocket.endPointId != null) {
				this.call("NotificationRegistryInterface", "unregisterNewProjectHandler", {
					endPointId: this.webSocket.endPointId
				}, function () {
					if (callback != null) {
						callback();
					}
				});
			}
		}
	}, {
		key: 'unregisterNewRevisionOnSpecificProjectHandler',
		value: function unregisterNewRevisionOnSpecificProjectHandler(poid, handler, callback) {
			this.unregister(handler);
			this.call("NotificationRegistryInterface", "unregisterNewRevisionOnSpecificProjectHandler", {
				endPointId: this.webSocket.endPointId,
				poid: poid
			}, function () {
				if (callback != null) {
					callback();
				}
			});
		}
	}, {
		key: 'unregisterNewExtendedDataOnRevisionHandler',
		value: function unregisterNewExtendedDataOnRevisionHandler(roid, handler, callback) {
			this.unregister(handler);
			this.call("NotificationRegistryInterface", "unregisterNewExtendedDataOnRevisionHandler", {
				endPointId: this.webSocket.endPointId,
				roid: roid
			}, function () {
				if (callback != null) {
					callback();
				}
			});
		}
	}, {
		key: 'registerProgressHandler',
		value: function registerProgressHandler(topicId, handler, callback) {
			var _this15 = this;

			this.register("NotificationInterface", "progress", handler, function () {
				_this15.call("NotificationRegistryInterface", "registerProgressHandler", {
					topicId: topicId,
					endPointId: _this15.webSocket.endPointId
				}, function () {
					if (callback != null) {
						callback();
					} else {
						_this15.call("NotificationRegistryInterface", "getProgress", {
							topicId: topicId
						}, function (state) {
							handler(topicId, state);
						});
					}
				});
			});
		}
	}, {
		key: 'unregisterProgressHandler',
		value: function unregisterProgressHandler(topicId, handler, callback) {
			this.unregister(handler);
			this.call("NotificationRegistryInterface", "unregisterProgressHandler", {
				topicId: topicId,
				endPointId: this.webSocket.endPointId
			}, function () {}).done(callback);
		}
	}, {
		key: 'unregister',
		value: function unregister(listener) {
			for (var i in this.listeners) {
				for (var j in this.listeners[i]) {
					var list = this.listeners[i][j];
					for (var k = 0; k < list.length; k++) {
						if (list[k] === listener) {
							list.splice(k, 1);
							return;
						}
					}
				}
			}
		}
	}, {
		key: 'createRequest',
		value: function createRequest(interfaceName, method, data) {
			var object = {};
			object["interface"] = interfaceName;
			object.method = method;
			object.parameters = data;

			return object;
		}
	}, {
		key: 'getJson',
		value: function getJson(address, data, success, error) {
			var _this16 = this;

			var xhr = new XMLHttpRequest();
			xhr.open("POST", address);
			xhr.onerror = function () {
				if (error != null) {
					error("Unknown network error");
				}
			};
			xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
			xhr.onload = function (jqXHR, textStatus, errorThrown) {
				if (xhr.status === 200) {
					var _data = "";
					try {
						_data = JSON.parse(xhr.responseText);
					} catch (e) {
						if (e instanceof SyntaxError) {
							if (error != null) {
								error(e);
							} else {
								_this16.notifier.setError(e);
								console.error(e);
							}
						} else {
							console.error(e);
						}
					}
					success(_data);
				} else {
					if (error != null) {
						error(jqXHR, textStatus, errorThrown);
					} else {
						_this16.notifier.setError(textStatus);
						console.error(jqXHR, textStatus, errorThrown);
					}
				}
			};
			xhr.send(JSON.stringify(data));
		}
	}, {
		key: 'multiCall',
		value: function multiCall(requests, callback, errorCallback, showBusy, showDone, showError, connectWebSocket) {
			var _this17 = this;

			if (!this.webSocket.connected && this.token != null && connectWebSocket) {
				this.webSocket.connect().then(function () {
					_this17.multiCall(requests, callback, errorCallback, showBusy, showDone, showError);
				});
				return;
			}
			var promise = new BimServerApiPromise();
			var request = null;
			if (requests.length == 1) {
				request = requests[0];
				if (this.interfaceMapping[request[0]] == null) {
					this.log("Interface " + request[0] + " not found");
				}
				request = {
					request: this.createRequest(this.interfaceMapping[request[0]], request[1], request[2])
				};
			} else if (requests.length > 1) {
				var requestObjects = [];
				requests.forEach(function (request) {
					if (_this17.interfaceMapping[request[0]] == null) {
						_this17.log("Interface " + request[0] + " not found");
					}
					requestObjects.push(_this17.createRequest(_this17.interfaceMapping[request[0]], request[1], request[2]));
				});
				request = {
					requests: requestObjects
				};
			} else if (requests.length === 0) {
				promise.fire();
				callback();
			}

			//    		this.notifier.clear();

			if (this.token != null) {
				request.token = this.token;
			}

			var key = requests[0][1];
			requests.forEach(function (item, index) {
				if (index > 0) {
					key += "_" + item;
				}
			});

			var showedBusy = false;
			if (showBusy) {
				if (this.lastBusyTimeOut != null) {
					clearTimeout(this.lastBusyTimeOut);
					this.lastBusyTimeOut = null;
				}
				if (typeof window !== 'undefined' && window.setTimeout != null) {
					this.lastBusyTimeOut = window.setTimeout(function () {
						_this17.notifier.setInfo(_this17.translate(key + "_BUSY"), -1);
						showedBusy = true;
					}, 200);
				}
			}

			//    		this.notifier.resetStatusQuick();

			this.log("request", request);

			this.getJson(this.address, request, function (data) {
				_this17.log("response", data);
				var errorsToReport = [];
				if (requests.length == 1) {
					if (showBusy) {
						if (_this17.lastBusyTimeOut != null) {
							clearTimeout(_this17.lastBusyTimeOut);
						}
					}
					if (data.response.exception != null) {
						if (showError) {
							if (_this17.lastTimeOut != null) {
								clearTimeout(_this17.lastTimeOut);
							}
							_this17.notifier.setError(data.response.exception.message);
						} else {
							if (showedBusy) {
								_this17.notifier.resetStatus();
							}
						}
					} else {
						if (showDone) {
							_this17.notifier.setSuccess(_this17.translate(key + "_DONE"), 5000);
						} else {
							if (showedBusy) {
								_this17.notifier.resetStatus();
							}
						}
					}
				} else if (requests.length > 1) {
					data.responses.forEach(function (response) {
						if (response.exception != null) {
							if (errorCallback == null) {
								_this17.notifier.setError(response.exception.message);
							} else {
								errorsToReport.push(response.exception);
							}
						}
					});
				}
				if (errorsToReport.length > 0) {
					errorCallback(errorsToReport);
				} else {
					if (requests.length == 1) {
						callback(data.response);
					} else if (requests.length > 1) {
						callback(data.responses);
					}
				}
				promise.fire();
			}, function (jqXHR, textStatus, errorThrown) {
				if (textStatus == "abort") {
					// ignore
				} else {
					_this17.log(errorThrown);
					_this17.log(textStatus);
					_this17.log(jqXHR);
					if (_this17.lastTimeOut != null) {
						clearTimeout(_this17.lastTimeOut);
					}
					_this17.notifier.setError(_this17.translate("ERROR_REMOTE_METHOD_CALL"));
				}
				if (callback != null) {
					var result = {};
					result.error = textStatus;
					result.ok = false;
					callback(result);
				}
				promise.fire();
			});
			return promise;
		}
	}, {
		key: 'getModel',
		value: function getModel(poid, roid, schema, deep, callback, name) {
			var model = new Model(this, poid, roid, schema);
			if (name != null) {
				model.name = name;
			}
			model.load(deep, callback);
			return model;
		}
	}, {
		key: 'createModel',
		value: function createModel(poid, callback) {
			var model = new Model(this, poid);
			model.init(callback);
			return model;
		}
	}, {
		key: 'callWithNoIndication',
		value: function callWithNoIndication(interfaceName, methodName, data, callback) {
			return this.call(interfaceName, methodName, data, callback, null, false, false, false);
		}
	}, {
		key: 'callWithFullIndication',
		value: function callWithFullIndication(interfaceName, methodName, data, callback) {
			return this.call(interfaceName, methodName, data, callback, null, true, true, true);
		}
	}, {
		key: 'callWithUserErrorIndication',
		value: function callWithUserErrorIndication(action, data, callback) {
			return this.call(null, null, data, callback, null, false, false, true);
		}
	}, {
		key: 'callWithUserErrorAndDoneIndication',
		value: function callWithUserErrorAndDoneIndication(action, data, callback) {
			return this.call(null, null, data, callback, null, false, true, true);
		}
	}, {
		key: 'isA',
		value: function isA(schema, typeSubject, typeName) {
			var _this18 = this;

			var isa = false;
			if (typeSubject == typeName) {
				return true;
			}

			var subject = this.schemas[schema][typeSubject];
			if (typeSubject == "GeometryInfo" || typeSubject == "GeometryData") {
				subject = this.schemas.geometry[typeSubject];
			}

			if (subject == null) {
				console.log(typeSubject, "not found");
			}
			subject.superclasses.some(function (superclass) {
				if (superclass == typeName) {
					isa = true;
					return true;
				}
				if (_this18.isA(schema, superclass, typeName)) {
					isa = true;
					return true;
				}
				return false;
			});
			return isa;
		}
	}, {
		key: 'initiateCheckin',
		value: function initiateCheckin(project, deserializerOid, callback) {
			this.call("ServiceInterface", "initiateCheckin", {
				deserializerOid: deserializerOid,
				poid: project.oid
			}, function (topicId) {
				if (callback != null) {
					callback(topicId);
				}
			});
		}
	}, {
		key: 'checkin',
		value: function checkin(topicId, project, comment, file, deserializerOid, progressListener, success, error) {
			var xhr = new XMLHttpRequest();

			xhr.upload.addEventListener("progress", function (e) {
				if (e.lengthComputable) {
					var percentage = Math.round(e.loaded * 100 / e.total);
					progressListener(percentage);
				}
			}, false);

			xhr.addEventListener("load", function (event) {
				var result = JSON.parse(xhr.response);

				if (result.exception == null) {
					if (success != null) {
						success(result.checkinid);
					}
				} else {
					if (error == null) {
						console.error(result.exception);
					} else {
						error(result.exception);
					}
				}
			}, false);

			xhr.open("POST", this.baseUrl + "/upload");

			var formData = new FormData();

			formData.append("token", this.token);
			formData.append("deserializerOid", deserializerOid);
			formData.append("comment", comment);
			formData.append("poid", project.oid);
			formData.append("topicId", topicId);
			formData.append("file", file);

			xhr.send(formData);
		}
	}, {
		key: 'addExtendedData',
		value: function addExtendedData(roid, title, schema, data, success, error) {
			var _this19 = this;

			var reader = new FileReader();
			var xhr = new XMLHttpRequest();

			xhr.addEventListener("load", function (e) {
				var result = JSON.parse(xhr.response);

				if (result.exception == null) {
					_this19.call("ServiceInterface", "addExtendedDataToRevision", {
						roid: roid,
						extendedData: {
							__type: "SExtendedData",
							title: title,
							schemaId: schema.oid,
							fileId: result.fileId
						}
					}, function () {
						success(result.checkinid);
					});
				} else {
					error(result.exception);
				}
			}, false);
			xhr.open("POST", this.baseUrl + "/upload");
			if (typeof data == "File") {
				reader.onload = function () {
					var formData = new FormData();
					formData.append("action", "file");
					formData.append("token", _this19.token);
					file.type = schema.contentType;

					var blob = new Blob([file], {
						type: schema.contentType
					});

					formData.append("file", blob, file.name);
					xhr.send(formData);
				};
				reader.readAsBinaryString(file);
			} else {
				// Assuming data is a Blob
				var formData = new FormData();
				formData.append("action", "file");
				formData.append("token", this.token);
				formData.append("file", data, data.name);
				xhr.send(formData);
			}
		}
	}, {
		key: 'setToken',
		value: function setToken(token, callback, errorCallback) {
			var _this20 = this;

			this.token = token;
			this.call("AuthInterface", "getLoggedInUser", {}, function (data) {
				_this20.user = data;
				_this20.webSocket.connect(callback);
			}, function () {
				if (errorCallback != null) {
					errorCallback();
				}
			}, true, false, true, false);
		}

		/**
   * Call a single method, this method delegates to the multiCall method
   * @param {string} interfaceName - Interface name, e.g. "ServiceInterface"
   * @param {string} methodName - Methodname, e.g. "addProject"
   * @param {Object} data - Object with a field per arument
   * @param {Function} callback - Function to callback, first argument in callback will be the returned object
   * @param {Function} errorCallback - Function to callback on error
   * @param {boolean} showBusy - Whether to show busy indication
   * @param {boolean} showDone - Whether to show done indication
   * @param {boolean} showError - Whether to show errors
   * 
   */

	}, {
		key: 'call',
		value: function call(interfaceName, methodName, data, callback, errorCallback) {
			var showBusy = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : true;
			var showDone = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
			var showError = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : true;
			var connectWebSocket = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : true;

			return this.multiCall([[interfaceName, methodName, data]], function (data) {
				if (data.exception == null) {
					if (callback != null) {
						callback(data.result);
					}
				} else {
					if (errorCallback != null) {
						errorCallback(data.exception);
					}
				}
			}, errorCallback, showBusy, showDone, showError, connectWebSocket);
		}
	}]);
	return BimServerClient;
}();

exports['default'] = BimServerClient;
exports.BimServerApiPromise = BimServerApiPromise;
exports.BimServerApiWebSocket = BimServerApiWebSocket;
exports.Model = Model;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bimserverapi.umd.js.map
