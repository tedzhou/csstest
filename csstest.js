/**
 * 测试css样式
 * inspried by https://github.com/andyedinborough/stress-css
 */
define("widget/csstest", [], function (require, exports, module) {
	var cssTest = {
		now: 0,
		_toArr: function (a) {
			return a ? [].slice.call(a) : [];
		},
		/**
		 * 滚到底, 这里算时间的，不要写console等io
		 * @param opt
		 * @private
		 */
		workOnce: function (opt) {
			// 复位
//			setTimeout(function () {
			if (!opt) {
				return;
			}
			var delta = opt.delta || 1;
			var setup = opt.setup || 1000;
			var maxTime = opt.maxTime || 2000;
			var st = new Date();
			var frames = 0;
			var locked = false;
			var factor = 1;
			var callback = opt.callback;
			var repeat = opt.repeat || 3;
			var current = opt.current || 1;
			var fn = function () {
				if (locked) {
					////console.loh('loged');
					return;
				}
				locked = true;
				if (document.body.scrollTop + window.innerHeight >= document.body.scrollHeight) {
					factor = -1;
				}
				if (document.body.scrollTop == 0) {
					factor = 1;
				}
				if ((frames < setup * current) && (new Date() - st <= maxTime * current)) {
					// document.body.scrollTop;
					locked = false;
					frames++;
					window.scrollBy(0, factor * delta);
				} else {
					current++;
					if (current <= repeat) {
						locked = false;
						frames++;
						window.scrollTo(0, 1);
					} else {
						var et = new Date();
						window.removeEventListener('scroll', fn);
						locked = false;

						if (callback) {
							callback({
								frames: frames,
								time: et - st
							});
						}
					}

				}
			};
			window.addEventListener('scroll', fn);

			// 开动
			window.scrollTo(0, 1);

//			}, 200);
		},
		_getDefaultProperty: function () {
			var customElm = document.createElement('div');
			document.body.appendChild(customElm);
			var cssProperty = window.getComputedStyle(customElm, null);
			return this._filterCss(cssProperty);
		},
		_getDefaultValue: function (key) {
			var customElm = document.createElement('div');
			document.body.appendChild(customElm);
			var value = window.getComputedStyle(customElm, null).getPropertyValue(key);
			document.body.removeChild(customElm);
			return value;
		},
		_filterCss: function (originCss) {
			var elementCssArr = [];
			for (var i = 0, l = originCss.length; i < l; i++) {
				var key = originCss[i];
				if (!/\d/.test(key) && key !== 'cssText' && key !== 'length' && key !== 'color' && key != 'display' && key != 'height' && key != 'width') {
					elementCssArr.push({
						key: key,
						value: originCss.getPropertyValue(key)
					});
				}
			}

			return elementCssArr;
		},
		_addProperty: function (involve) {
			involve.forEach(function (item) {
				if (item.isInline) {
					item.dom.style[item.key] = item.oldValue;
					if (item.setWebkit) {
						item.dom.style['-webkit-' + item.key] = item.oldValue;
					}
				} else {
					// 直接去掉
					item.dom.style[item.key] = '';
					if (item.setWebkit) {
						item.dom.style['-webkit-' + item.key] = '';
					}
				}
			});
		},
		/**
		 * 遍历，覆盖property
		 * @param opt
		 * @private
		 */
		_rollProxy: function (opt) {

			var result = opt.result = (opt.result || []);
			var callback = opt.callback;
			var leftQueue = opt.propertyArr;

			if (!leftQueue || leftQueue.length < 1) {
				callback(result);
				return;
			}

			var currentProperty = leftQueue.shift();
			var involve = this._setSepcProperty({
				key: currentProperty.key,
				to: currentProperty.value
			});

			var that = this;
			if (involve.length > 1) {
				setTimeout(function () {
					that.workOnce({
						callback: function (r) {
							var frames = r.frames;
							var time = r.time;

							result.push({
								frames: frames,
								time: time,
								pt: time / frames,
								property: currentProperty.key,
								involve: involve
							});

							// 恢复样式
							that._addProperty(involve);
							// 这个时候leftqueue是少了一项的
							that._rollProxy(opt);
						}
					});
				}, 200);
			} else {
				setTimeout(function () {
					that._rollProxy(opt);
				}, 0);
			}
		},
		detectAllProperty: function (opt) {
			var propertyArr = opt.propertyArr || this._getDefaultProperty();
			this._rollProxy({
				propertyArr: propertyArr,
				callback: function (result) {
					opt.callback && opt.callback(result);
				}
			});

		},
		/**
		 * 没修改样式
		 * @param callback
		 */
		baseDetect: function (callback) {
			this.workOnce({
				callback: function (r) {
					var frames = r.frames;
					var time = r.time;

					var result = {
						frames: frames,
						time: time,
						pt: time / frames,
						property: '==base=='
					};

					if (callback) {
						callback(result);
					} else {
					}
				}
			});
		},
		_setSepcProperty: function (current) {
			if (!current.from) {
				current.from = "*";
			}
			if (!current.to) {
				current.to = this._getDefaultValue(current.key);
			}
			var involve = [];
			this._toArr(document.querySelectorAll('*')).forEach(function (el) {
				var oldValue = window.getComputedStyle(el, null).getPropertyValue(current.key);
				if (oldValue != current.to && (oldValue == current.from || current.from == '*')) {

					('oldV', oldValue, 'from', current.from, 'to', current.to);
					// 和默认的不一样就搞成一样
					var isInline = true;
					if (!el.style[current.key]) {
						isInline = false;
					}
					// 如果不是inline的，把样式还原的时候就直接去掉style上的好了
					el.style[current.key] = current.to;
					var setWebkit = false;
					if (current.key.indexOf('webkit') < 0) {
						setWebkit = true;
						el.style['-webkit-' + current.key] = current.to;
					}
					involve.push({
						dom: el,
						key: current.key,
						oldValue: oldValue,
						isInline: isInline,
						setWebkit: setWebkit
					});
				}
			});

			document.body.clientHeight;
			return involve;
		},
		removePropertyAndDetect: function (specProperty, callback) {
			var that = this;
			var involve = this._setSepcProperty(specProperty);
			setTimeout(function () {
				that.workOnce({
					callback: function (r) {
						var frames = r.frames;
						var time = r.time;

						var result = {
							frames: frames,
							time: time,
							property: specProperty.key,
							pt: time / frames
						}
						that._addProperty(involve);
						callback(result);
					}
				});
			}, 0);

		},
		/**
		 * 比较
		 * @param callback
		 */
		autoDetect: function (callback) {
			var that = this;
			this.baseDetect(function (r) {
				var result = [];
				result.push(r);
				that.detectAllProperty({
					callback: function (resultArr) {
						resultArr = resultArr.sort(function (a, b) {
							return a.pt - b.pt;
						});
						result = result.concat(resultArr);
						that.showTable(result);
					}
				});
			});
		},
		showTable: function (result) {

			var div = document.createElement('div');
			div.style.position = "absolute";
			div.style.zIndex = "99999";
			div.style.background = 'white';

			div.innerHTML = '<a onclick="this.parentNode.parentNode.removeChild(parentNode);" style="float:left;">关闭</a>' +
				'<a onclick="this.parentNode.parentNode.removeChild(parentNode);window.cssTest.setup();" style="float:right;">菜单</a>';
			var table = document.createElement('table');
			table.id = "graph";
			var str = "<tr><th>property</th><th>time/frames</th></tr>";
			result.forEach((function (r) {
				str += "<tr><td>" + r.property + "</td><td>" + r.pt + "</td></tr>";
			}));

			table.innerHTML = str;
			div.appendChild(table);
			document.body.insertBefore(div, document.body.firstChild);
		},
		setup: function () {
			var that = this;

			if (location.href.indexOf('csstest') >= 0) {
				var cmd = prompt('输入命令:1-自动...。2-清楚制定样式.3.base.4.cmd');
				if (cmd == 1) {
					this.autoDetect();
				} else if (cmd == 2) {
					var key = prompt('输入你要干掉的样式');
					that.baseDetect(function (result) {

						that.removePropertyAndDetect({key: key}, function (r) {

							that.showTable([result].concat(r));

						});
					});
				} else if (cmd == 3) {
					that.baseDetect(function (result) {
						that.showTable([result]);
					});
				} else if (cmd == 4) {
					eval('(' + prompt('cssTest:') + ')');
				}
			}
		}
	};

	window.cssTest = cssTest;
	window.addEventListener('load', function () {
		setTimeout(function () {
			cssTest.setup();
		}, 4000);
	});

	return cssTest;
});
//@ sourceURL = testCss.js