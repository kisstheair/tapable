/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Hook = require("./Hook");
const HookCodeFactory = require("./HookCodeFactory");

class SyncHookCodeFactory extends HookCodeFactory {                           // HookCodeFactory 是决定 传入的taps  按照什么样的顺序执行的
	content({ onError, onResult, onDone, rethrowIfPossible }) {
		return this.callTapsSeries({
			onError: (i, err) => onError(err),
			onDone,
			rethrowIfPossible
		});
	}
}

const factory = new SyncHookCodeFactory();




/**
 *  一种钩子只支持一种执行方式，   所以严格控制放入的类型  type
 *  这里只能用tap()   不能用 tapAsync 和tapPromise
 *
 *
 *  可以带参数， 但是 必须是个数组 ，
 *  const h1 = new SyncHook(["test"]);
 	const h2 = new SyncHook(["test", "arg2"]);
 	const h3 = new SyncHook(["test", "arg2", "arg3"]);
 * */

class SyncHook extends Hook {                                                   //Hook 是放入钩子的地方， 决定怎么放入{name:,fn:,type}， 放到哪里， tap 数组
	tapAsync() {
		throw new Error("tapAsync is not supported on a SyncHook");
	}

	tapPromise() {
		throw new Error("tapPromise is not supported on a SyncHook");
	}


	/**  調用執行額時候傳入 option
	 * option : {
			taps: this.taps,
			interceptors: this.interceptors,
			args: this._args,
			type: type
		}
	 * */
	compile(options) {

		factory.setup(this, options);                     //  把taps中所有的fn 提出来放到 Hook._x 下面------------------------(这样看来，一种钩子只支持一种执行方式，  sync  async  promise)
		return factory.create(options);                    // 返回的是一个函数，  这个函数中按照一定的规则 执行taps中  所有的 fn
	}
}

module.exports = SyncHook;
