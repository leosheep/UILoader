var sz = sz || {};

sz.UILoader = cc.Class.extend({
    _eventPrefix: null,
    _memberPrefix: null,
    version: null,
    /**
     * 加载UI文件
     * @param target将  jsonFile加载出的节点绑定到的目标
     * @param jsonFile  cocostudio UI编辑器生成的json文件
     */
    widgetFromJsonFile: function(target, jsonFile, options) {
        cc.assert(target && jsonFile);
        if (!options) {
            options = {};
        }
        this._eventPrefix  =  options.eventPrefix || sz.UILoader.DEFAULT_EVENT_PREFIX;
        this._memberPrefix = options.memberPrefix || sz.UILoader.DEFAULT_MEMBER_PREFIX;
        this.version = options.version || 1;
        if(this.version == 1) {
            var rootNode = ccs.uiReader.widgetFromJsonFile(jsonFile);
        }else{
            var rootNode = ccs.csLoader.createNode(jsonFile);
        }
        if (!rootNode) {
            cc.log("Load json file failed");
        }
        target.rootNode = rootNode;
        target.addChild(rootNode);
        this._bindMenbers(rootNode, target);

        //PS:原UILoader没给rootNode绑定事件，同时也没返回值
        this._registerWidgetEvent(target, rootNode);
        return rootNode;
    },

    /**
     * 递归对rootWidget下的子节点进行成员绑定
     * @param rootWidget
     * @param target
     * @private
     */
    _bindMenbers: function(rootWidget, target) {
        var widgetName,
            children = rootWidget.getChildren();

        var self = this;
        children.forEach(function(widget) {
            widgetName = widget.getName();

            //控件名存在，绑定到target上
            var prefix = widgetName.substr(0, self._memberPrefix.length);
            if (prefix === self._memberPrefix) {
                target[widgetName] = widget;
                self._registerWidgetEvent(target, widget);
            }

            //绑定子控件,可以实现: a._b._c._d 访问子控件
            if (!rootWidget[widgetName]) {
                rootWidget[widgetName] = widget;
            }

            //如果还有子节点，递归进去
            if (widget.getChildrenCount()) {
                self._bindMenbers(widget, target);
            }

        });
    },

    /**
     * 获取控件事件
     * @param widget
     * @returns {*}
     */
    _getWidgetEvent: function(widget) {
        if(this.version == 2){
            return sz.UILoader.widgetEvents[0];
        }
        var bindWidgetEvent = null;
        var events = sz.UILoader.widgetEvents;
        for (var i = 0; i < events.length; i++) {
            bindWidgetEvent = events[i];
            if (widget instanceof bindWidgetEvent.widgetType) {
                break;
            }
        }
        return bindWidgetEvent;
    },

    /**
     * 注册控件事件
     * @param target
     * @param widget
     * @private
     */
    _registerWidgetEvent: function(target, widget) {
        var name = widget.getName();

        //截取前缀,首字母大定
        var newName = name[this._memberPrefix.length].toUpperCase() + name.slice(this._memberPrefix.length + 1);
        var eventName = this._eventPrefix + newName + "Event";
        var isBindEvent = false;

        if (target[eventName]) {
            isBindEvent = true;
        } else {
            //取事控件件名
            var widgetEvent = this._getWidgetEvent(widget);
            if (!widgetEvent) {
                return;
            }
            //检查事函数,生成事件名数组
            var eventNameArray = [];
            for (var i = 0; i < widgetEvent.events.length; i++) {
                eventName = this._eventPrefix + newName + widgetEvent.events[i];
                eventNameArray.push(eventName);
                if (cc.isFunction(target[eventName])) {
                    isBindEvent = true;
                }
            }

        }

        //事件响应函数
        var self = this;
        var eventFunc = function(sender, type) {
            var callBack;
            if (eventNameArray) {
                var funcName = eventNameArray[type];
                callBack = target[funcName];
            } else {
                callBack = target[eventName];
            }

            if (self._onWidgetEvent) {
                self._onWidgetEvent(sender, type);
            }

            if (callBack) {
                return callBack.call(target, sender, type);
            }
        };

        //注册事件监听
        if (isBindEvent) {
            widget.setTouchEnabled(true);
            if (widget.addEventListener) {
                widget.addEventListener(eventFunc, target);
            } else {
                widget.addTouchEventListener(eventFunc, target);
            }
        }
    }


    /**
     * 控件事件捕获, 可以由子类重写此函数
     * @param sender
     * @param type
     * @private
     */
    //_onWidgetEvent: function(sender, type) {
    //
    //}

});

sz.UILoader.DEFAULT_EVENT_PREFIX = "_on";
sz.UILoader.DEFAULT_MEMBER_PREFIX = "_";

//触摸事件
sz.UILoader.touchEvents = ["TouchBegan", "TouchMoved", "TouchEnded"];
//控件事件列表
sz.UILoader.widgetEvents = [
    //Button
    {widgetType: ccui.Button, events: sz.UILoader.touchEvents},
    //ImageView
    {widgetType: ccui.ImageView, events: sz.UILoader.touchEvents},
    //TextFiled
    {widgetType: ccui.TextField, events: ["AttachWithIME", "DetachWithIME", "InsertText", "DeleteBackward"]},
    //CheckBox
    {widgetType: ccui.CheckBox, events: ["Selected", "Unselected"]},
    //ListView
    {widgetType: ccui.ListView, events: ["SelectedItem"]},
    //Panel
    {widgetType: ccui.Layout, events: sz.UILoader.touchEvents},
    //BMFont
    {widgetType: ccui.TextBMFont, events: sz.UILoader.touchEvents},
    //last must null
    null
];

sz.uiloader = new sz.UILoader();
