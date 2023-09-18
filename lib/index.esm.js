var cache = [];
function getCache() {
  return cache;
}
function addCache(data) {
  cache.push(data);
}
function clearCache() {
  cache.length = 0;
}

var timer = null;

/**
 * 上报
 * @param {*} type 
 * @param {*} params 
 */
function lazyReport(type, params) {
  var appId = window['_monitor_app_id_'];
  var userId = window['_monitor_user_id_'];
  var delay = window['_monitor_delay_'];
  var logParams = {
    appId: appId,
    // 项目的appId
    userId: userId,
    // 用户id
    type: type,
    // error/action/visit/user
    data: params,
    // 上报的数据
    currentTime: new Date().getTime(),
    // 时间戳
    currentPage: window.location.href,
    // 当前页面
    ua: navigator.userAgent // ua信息
  };

  var logParamsString = JSON.stringify(logParams);
  addCache(logParamsString);
  var data = getCache();
  if (delay === 0) {
    // delay=0相当于不做延迟上报
    report(data);
    return;
  }
  if (data.length > 10) {
    report(data);
    clearTimeout(timer);
    return;
  }
  clearTimeout(timer);
  timer = setTimeout(function () {
    report(data);
  }, delay);
}
function report(data) {
  var url = window['_monitor_report_url_'];

  // ------- fetch方式上报 -------
  // 跨域问题
  // fetch(url, {
  //   method: 'POST',
  //   body: JSON.stringify(data),
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  // }).then(res => {
  //   console.log(res);
  // }).catch(err => {
  //   console.error(err);
  // })

  // ------- navigator/img方式上报 -------
  // 不会有跨域问题
  if (navigator.sendBeacon) {
    // 支持sendBeacon的浏览器
    navigator.sendBeacon(url, JSON.stringify(data));
  } else {
    // 不支持sendBeacon的浏览器
    var oImage = new Image();
    oImage.src = "".concat(url, "?logs=").concat(data);
  }
  clearCache();
}

/**
 * 手动上报
 */
function tracker(actionType, data) {
  lazyReport('action', {
    actionType: actionType,
    data: data
  });
}

/**
 * 自动上报
 */
function autoTrackerReport() {
  // 自动上报
  document.body.addEventListener('click', function (e) {
    var clickedDom = e.target;

    // 获取标签上的data-target属性的值
    var target = clickedDom === null || clickedDom === void 0 ? void 0 : clickedDom.getAttribute('data-target');

    // 获取标签上的data-no属性的值
    var no = clickedDom === null || clickedDom === void 0 ? void 0 : clickedDom.getAttribute('data-no');
    // 避免重复上报
    if (no) {
      return;
    }
    if (target) {
      lazyReport('action', {
        actionType: 'click',
        data: target
      });
    } else {
      // 获取被点击元素的dom路径
      var path = getPathTo(clickedDom);
      lazyReport('action', {
        actionType: 'click',
        data: path
      });
    }
  }, false);
}

/**
 * history路由监听
 */
function historyPageTrackerReport() {
  var beforeTime = Date.now(); // 进入页面的时间
  var beforePage = ''; // 上一个页面

  // 获取在某个页面的停留时间
  function getStayTime() {
    var curTime = Date.now();
    var stayTime = curTime - beforeTime;
    beforeTime = curTime;
    return stayTime;
  }

  /**
   * 重写pushState和replaceState方法
   * @param {*} name 
   * @returns 
   */
  var createHistoryEvent = function createHistoryEvent(name) {
    // 拿到原来的处理方法
    var origin = window.history[name];
    return function (event) {
      // if (name === 'replaceState') {
      //   const { current } = event;
      //   const pathName = location.pathname;
      //   if (current === pathName) {
      //     let res = origin.apply(this, arguments);
      //     return res;
      //   }
      // }

      var res = origin.apply(this, arguments);
      var e = new Event(name);
      e.arguments = arguments;
      window.dispatchEvent(e);
      return res;
    };
  };

  // history.pushState
  window.addEventListener('pushState', function () {
    listener();
  });

  // history.replaceState
  window.addEventListener('replaceState', function () {
    listener();
  });
  window.history.pushState = createHistoryEvent('pushState');
  window.history.replaceState = createHistoryEvent('replaceState');
  function listener() {
    var stayTime = getStayTime(); // 停留时间
    var currentPage = window.location.href; // 页面路径
    lazyReport('visit', {
      stayTime: stayTime,
      page: beforePage
    });
    beforePage = currentPage;
  }

  // 页面load监听
  window.addEventListener('load', function () {
    // beforePage = location.href;
    listener();
  });

  // unload监听
  window.addEventListener('unload', function () {
    listener();
  });

  // history.go()、history.back()、history.forward() 监听
  window.addEventListener('popstate', function () {
    listener();
  });
}

/**
 * hash路由监听
 */
function hashPageTrackerReport() {
  var beforeTime = Date.now(); // 进入页面的时间
  var beforePage = ''; // 上一个页面

  function getStayTime() {
    var curTime = Date.now();
    var stayTime = curTime - beforeTime;
    beforeTime = curTime;
    return stayTime;
  }
  function listener() {
    var stayTime = getStayTime();
    var currentPage = window.location.href;
    lazyReport('visit', {
      stayTime: stayTime,
      page: beforePage
    });
    beforePage = currentPage;
  }

  // hash路由监听
  window.addEventListener('hashchange', function () {
    listener();
  });

  // 页面load监听
  window.addEventListener('load', function () {
    listener();
  });
  var createHistoryEvent = function createHistoryEvent(name) {
    var origin = window.history[name];
    return function (event) {
      // if (name === 'replaceState') {
      //   const { current } = event;
      //   const pathName = location.pathname;
      //   if (current === pathName) {
      //     let res = origin.apply(this, arguments);
      //     return res;
      //   }
      // }

      var res = origin.apply(this, arguments);
      var e = new Event(name);
      e.arguments = arguments;
      window.dispatchEvent(e);
      return res;
    };
  };
  window.history.pushState = createHistoryEvent('pushState');

  // history.pushState
  window.addEventListener('pushState', function () {
    listener();
  });
}

/**
 * 全局错误捕获
 */
function errorTrackerReport() {
  // --------  js error ---------
  var originOnError = window.onerror;
  window.onerror = function (msg, url, row, col, error) {
    // 处理原有的onerror
    if (originOnError) {
      originOnError.call(window, msg, url, row, col, error);
    }
    // 错误上报
    lazyReport('error', {
      message: msg,
      file: url,
      row: row,
      col: col,
      error: error,
      errorType: 'jsError'
    });
  };

  // ------  promise error  --------
  window.addEventListener('unhandledrejection', function (error) {
    lazyReport('error', {
      message: error.reason,
      error: error,
      errorType: 'promiseError'
    });
  });

  // ------- resource error --------
  window.addEventListener('error', function (error) {
    var target = error.target;
    var isElementTarget = target instanceof HTMLScriptElement || target instanceof HTMLLinkElement || target instanceof HTMLImageElement;
    if (!isElementTarget) {
      return; // js error不再处理
    }

    lazyReport('error', {
      message: "加载 " + target.tagName + " 资源错误",
      file: target.src,
      errorType: 'resourceError'
    });
  }, true);
}

/**
 * 手动捕获错误
 */
function errorCaptcher(error, msg) {
  // 上报错误
  lazyReport('error', {
    message: msg,
    error: error,
    errorType: 'catchError'
  });
}

/**
 * 加载配置
 * @param {*} options 
 */
function loadConfig(options) {
  var appId = options.appId,
    userId = options.userId,
    reportUrl = options.reportUrl,
    autoTracker = options.autoTracker,
    delay = options.delay,
    hashPage = options.hashPage,
    errorReport = options.errorReport;

  // --------- appId ----------------
  if (appId) {
    window['_monitor_app_id_'] = appId;
  }

  // --------- userId ----------------
  if (userId) {
    window['_monitor_user_id_'] = userId;
  }

  // --------- 服务端地址 ----------------
  if (reportUrl) {
    window['_monitor_report_url_'] = reportUrl;
  }

  // -------- 合并上报的间隔 ------------
  if (delay) {
    window['_monitor_delay_'] = delay;
  }

  // --------- 是否开启错误监控 ------------
  if (errorReport) {
    errorTrackerReport();
  }

  // --------- 是否开启无痕埋点 ----------
  if (autoTracker) {
    autoTrackerReport();
  }

  // ----------- 路由监听 --------------
  if (hashPage) {
    hashPageTrackerReport(); // hash路由上报
  } else {
    historyPageTrackerReport(); // history路由上报
  }
}

/**
 * 获取元素的dom路径
 * @param {*} element 
 * @returns 
 */
function getPathTo(element) {
  if (element.id !== '') return '//*[@id="' + element.id + '"]';
  if (element === document.body) return element.tagName;
  var ix = 0;
  var siblings = element.parentNode.childNodes;
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element) return getPathTo(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
  }
}

//*[@id="root"]/DIV[1]/DIV[2]/BUTTON[1]

/**
 * 初始化配置
 * @param {*} options 
 */
function init(options) {
  // ------- 加载配置 ----------
  // 1.拿到配置信息 
  // 2.注入监控代码
  loadConfig(options);

  // -------- uv统计 -----------
  lazyReport('user', '加载应用');

  // ------ 防止卸载时还有剩余的埋点数据没发送 ------
  window.addEventListener('unload', function () {
    var data = getCache();
    report(data);

    // if (data.length > 0) {
    //   report(data);
    // }
  });
}

export { errorCaptcher, init, tracker };
