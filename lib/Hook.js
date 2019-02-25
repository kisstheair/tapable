/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class Hook {
	constructor(args) {
		if(!Array.isArray(args)) args = [];
		this._args = args;
		this.taps = [];                    // 把钩子插入到本对象的 tap []数组中，  { type: "promise", fn: fn ，name:'AAA'}
		this.interceptors = [];
		this.call = this._call = this._createCompileDelegate("call", "sync");                 //是一个函数，this。call()执行           顺序执行
		this.promise = this._promise = this._createCompileDelegate("promise", "promise");      //是一个函数，this。promise()执行        promise执行
		this.callAsync = this._callAsync = this._createCompileDelegate("callAsync", "async");    //是一个函数，this。callAsync()执行    异步执行
		this._x = undefined;               // tap中  所有fn 的一个数组。[fn,fn,fn,,,,,]
	}

	compile(options) {                                                         // 是一个函数，按照钩子集合的特性执行，  被继承之后被覆盖， 因为每个钩子特性不同
		throw new Error("Abstract: should be overriden");
	}

	_createCall(type) {                  //调用执行，  分情况， 有3种  call   promise  callAsync
		return this.compile({
			taps: this.taps,
			interceptors: this.interceptors,
			args: this._args,
			type: type
		});
	}

	_createCompileDelegate(name, type) {              // 套一层， 返回对应的函数
		const lazyCompileHook = (...args) => {
			this[name] = this._createCall(type);
			return this[name](...args);
		};
		return lazyCompileHook;
	}

	tap(options, fn) {
		if(typeof options === "string")
			options = { name: options };
		if(typeof options !== "object" || options === null)
			throw new Error("Invalid arguments to tap(options: Object, fn: function)");
		options = Object.assign({ type: "sync", fn: fn }, options);
		if(typeof options.name !== "string" || options.name === "")
			throw new Error("Missing name for tap");
		options = this._runRegisterInterceptors(options);
		this._insert(options);
	}

	tapAsync(options, fn) {
		if(typeof options === "string")
			options = { name: options };
		if(typeof options !== "object" || options === null)
			throw new Error("Invalid arguments to tapAsync(options: Object, fn: function)");
		options = Object.assign({ type: "async", fn: fn }, options);
		if(typeof options.name !== "string" || options.name === "")
			throw new Error("Missing name for tapAsync");
		options = this._runRegisterInterceptors(options);
		this._insert(options);
	}

	tapPromise(options, fn) {
		if(typeof options === "string")
			options = { name: options };
		if(typeof options !== "object" || options === null)
			throw new Error("Invalid arguments to tapPromise(options: Object, fn: function)");
		options = Object.assign({ type: "promise", fn: fn }, options);
		if(typeof options.name !== "string" || options.name === "")
			throw new Error("Missing name for tapPromise");
		options = this._runRegisterInterceptors(options);
		this._insert(options);
	}

	_runRegisterInterceptors(options) {
		for(const interceptor of this.interceptors) {
			if(interceptor.register) {
				const newOptions = interceptor.register(options);
				if(newOptions !== undefined)
					options = newOptions;
			}
		}
		return options;
	}

	withOptions(options) {
		const mergeOptions = opt => Object.assign({}, options, typeof opt === "string" ? { name: opt } : opt);

		// Prevent creating endless prototype chains
		options = Object.assign({}, options, this._withOptions);
		const base = this._withOptionsBase || this;
		const newHook = Object.create(base);

		newHook.tapAsync = (opt, fn) => base.tapAsync(mergeOptions(opt), fn),
		newHook.tap = (opt, fn) => base.tap(mergeOptions(opt), fn);
		newHook.tapPromise = (opt, fn) => base.tapPromise(mergeOptions(opt), fn);
		newHook._withOptions = options;
		newHook._withOptionsBase = base;
		return newHook;
	}

	isUsed() {
		return this.taps.length > 0 || this.interceptors.length > 0;
	}

	intercept(interceptor) {
		this._resetCompilation();
		this.interceptors.push(Object.assign({}, interceptor));
		if(interceptor.register) {
			for(let i = 0; i < this.taps.length; i++)
				this.taps[i] = interceptor.register(this.taps[i]);
		}
	}

	_resetCompilation() {                          // 使用之后    this[“call”] = this._createCall(type);
		this.call = this._call;                  // 初始化的时候      this.call = this._call = this._createCompileDelegate("call", "sync");
		this.callAsync = this._callAsync;
		this.promise = this._promise;
	}

	_insert(item) {                                   // 把钩子插入到本对象的 tap []数组中，  { type: "promise", fn: fn ，name:'AAA'}
		this._resetCompilation();
		let before;
		if(typeof item.before === "string")
			before = new Set([item.before]);
		else if(Array.isArray(item.before)) {
			before = new Set(item.before);
		}
		let stage = 0;
		if(typeof item.stage === "number")
			stage = item.stage;
		let i = this.taps.length;
		while(i > 0) {                           // 然后插入到最hou面的位置，  为什么不用 [].push()方法 推进去呢？
			i--;
			const x = this.taps[i];              //明白了，插入是有顺序的， 在什么之前，在什么位置hook.tap({name: "E",before: "B"，stage: -5}, () => ));
			this.taps[i+1] = x;
			const xStage = x.stage || 0;
			if(before) {
				if(before.has(x.name)) {         //从后向前， 如果有before，说明在这个之前， 所以这个位置跳过。
					before.delete(x.name);
					continue;
				}
				if(before.size > 0) {
					continue;
				}
			}
			if(xStage > stage) {
				continue;
			}
			i++;                          //如果没有before， 没有stage，那么 把 放到最后的位置就行了。
			break;
		}
		this.taps[i] = item;
	}
}

module.exports = Hook;
