/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
SDK.NetworkLog = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   * @param {!SDK.NetworkManager} networkManager
   */
  constructor(target, resourceTreeModel, networkManager) {
    super(SDK.NetworkLog, target);

    this._requests = [];
    this._requestForId = {};
    networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, this._onRequestStarted, this);
    resourceTreeModel.addEventListener(
        SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this._onLoad, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.DOMContentLoaded, this._onDOMContentLoaded, this);
  }

  /**
   * @param {!SDK.Target} target
   * @return {?SDK.NetworkLog}
   */
  static fromTarget(target) {
    return /** @type {?SDK.NetworkLog} */ (target.model(SDK.NetworkLog));
  }

  /**
   * @param {string} url
   * @return {?SDK.NetworkRequest}
   */
  static requestForURL(url) {
    for (var target of SDK.targetManager.targets()) {
      var networkLog = SDK.NetworkLog.fromTarget(target);
      var result = networkLog && networkLog.requestForURL(url);
      if (result)
        return result;
    }
    return null;
  }

  /**
   * @return {!Array.<!SDK.NetworkRequest>}
   */
  static requests() {
    var result = [];
    for (var target of SDK.targetManager.targets()) {
      var networkLog = SDK.NetworkLog.fromTarget(target);
      if (networkLog)
        result = result.concat(networkLog.requests());
    }
    return result;
  }

  /**
   * @return {!Array.<!SDK.NetworkRequest>}
   */
  requests() {
    return this._requests;
  }

  /**
   * @param {string} url
   * @return {?SDK.NetworkRequest}
   */
  requestForURL(url) {
    for (var i = 0; i < this._requests.length; ++i) {
      if (this._requests[i].url === url)
        return this._requests[i];
    }
    return null;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {!SDK.PageLoad}
   */
  pageLoadForRequest(request) {
    return request.__page;
  }

  /**
   * @param {!Common.Event} event
   */
  _onMainFrameNavigated(event) {
    var mainFrame = /** type {SDK.ResourceTreeFrame} */ event.data;
    // Preserve requests from the new session.
    this._currentPageLoad = null;
    var oldRequests = this._requests.splice(0, this._requests.length);
    this._requestForId = {};
    for (var i = 0; i < oldRequests.length; ++i) {
      var request = oldRequests[i];
      if (request.loaderId === mainFrame.loaderId) {
        if (!this._currentPageLoad)
          this._currentPageLoad = new SDK.PageLoad(request);
        this._requests.push(request);
        this._requestForId[request.requestId] = request;
        request.__page = this._currentPageLoad;
      }
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestStarted(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    this._requests.push(request);
    this._requestForId[request.requestId] = request;
    request.__page = this._currentPageLoad;
  }

  /**
   * @param {!Common.Event} event
   */
  _onDOMContentLoaded(event) {
    if (this._currentPageLoad)
      this._currentPageLoad.contentLoadTime = event.data;
  }

  /**
   * @param {!Common.Event} event
   */
  _onLoad(event) {
    if (this._currentPageLoad)
      this._currentPageLoad.loadTime = event.data;
  }

  /**
   * @param {!Protocol.Network.RequestId} requestId
   * @return {?SDK.NetworkRequest}
   */
  requestForId(requestId) {
    return this._requestForId[requestId];
  }
};


/**
 * @unrestricted
 */
SDK.PageLoad = class {
  /**
   * @param {!SDK.NetworkRequest} mainRequest
   */
  constructor(mainRequest) {
    this.id = ++SDK.PageLoad._lastIdentifier;
    this.url = mainRequest.url;
    this.startTime = mainRequest.startTime;
  }
};

SDK.PageLoad._lastIdentifier = 0;
