
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/UI/Header.svelte generated by Svelte v3.12.1 */

    const file = "src/UI/Header.svelte";

    function create_fragment(ctx) {
    	var header, h1;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "My Places";
    			attr_dev(h1, "class", "svelte-a0u5lt");
    			add_location(h1, file, 22, 2, 379);
    			attr_dev(header, "class", "dark-primary-color svelte-a0u5lt");
    			add_location(header, file, 21, 0, 341);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(header);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Header", options, id: create_fragment.name });
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const places = writable([
      {
        id: 'm1',
        name: 'Sinhgad',
        type: 'historical (fort)',
        description:
          'Sinhagad is a hill fortress located at around 35 km southwest of the city of Pune, India.',
        imageUrl:
          'https://www.hindujagruti.org/wp-content/uploads/2015/02/Kondana_Sinhagarh_Fort_640.jpg',
        address: 'Fortress in Thoptewadi, Maharashtra',
        contactEmail: 'code@test.com',
        isFavorite: false
      },
      {
        id: 'm2',
        name: 'Lonawala',
        type: 'Hill Station (nature)',
        description:
          'Lonavala is a hill station surrounded by green valleys in western India near Mumbai.',
        imageUrl:
          'https://media-cdn.tripadvisor.com/media/photo-s/18/81/c8/ff/lonavla-hill-station.jpg',
        address: 'Town in Maharashtra',
        contactEmail: 'swim@test.com',
        isFavorite: true
      }
    ]);

    const placeStore = {
      subscribe: places.subscribe,
      toggleFavorite: id => {
        places.update(items => {
          const updatedPlace = { ...items.find(m => m.id === id) };
          updatedPlace.isFavorite = !updatedPlace.isFavorite;
          const placesIndex = items.findIndex(m => m.id === id);
          const updatedPlaces = [...items];
          updatedPlaces[placesIndex] = updatedPlace;
          return updatedPlaces;
        });
      }
    };

    /* src/UI/Button.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/UI/Button.svelte";

    // (91:0) {:else}
    function create_else_block(ctx) {
    	var button, button_class_value, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			button = element("button");

    			if (default_slot) default_slot.c();

    			attr_dev(button, "class", button_class_value = "" + ctx.mode + " " + ctx.color + " svelte-dhxj9q");
    			attr_dev(button, "type", ctx.type);
    			button.disabled = ctx.disabled;
    			add_location(button, file$1, 91, 2, 1517);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(button_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if ((!current || changed.mode || changed.color) && button_class_value !== (button_class_value = "" + ctx.mode + " " + ctx.color + " svelte-dhxj9q")) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (!current || changed.type) {
    				attr_dev(button, "type", ctx.type);
    			}

    			if (!current || changed.disabled) {
    				prop_dev(button, "disabled", ctx.disabled);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(91:0) {:else}", ctx });
    	return block;
    }

    // (87:0) {#if href}
    function create_if_block(ctx) {
    	var a, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			a = element("a");

    			if (default_slot) default_slot.c();

    			attr_dev(a, "href", ctx.href);
    			attr_dev(a, "class", "svelte-dhxj9q");
    			add_location(a, file$1, 87, 2, 1476);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(a_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if (!current || changed.href) {
    				attr_dev(a, "href", ctx.href);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(87:0) {#if href}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.href) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { type = "button", href = null, mode = null, color = null, disabled = false } = $$props;

    	const writable_props = ['type', 'href', 'mode', 'color', 'disabled'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('mode' in $$props) $$invalidate('mode', mode = $$props.mode);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$props.disabled);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { type, href, mode, color, disabled };
    	};

    	$$self.$inject_state = $$props => {
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('mode' in $$props) $$invalidate('mode', mode = $$props.mode);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$props.disabled);
    	};

    	return {
    		type,
    		href,
    		mode,
    		color,
    		disabled,
    		click_handler,
    		$$slots,
    		$$scope
    	};
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$1, safe_not_equal, ["type", "href", "mode", "color", "disabled"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Button", options, id: create_fragment$1.name });
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mode() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mode(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/places/PlaceItem.svelte generated by Svelte v3.12.1 */
    const { console: console_1 } = globals;

    const file$2 = "src/places/PlaceItem.svelte";

    // (88:6) {:else}
    function create_else_block$1(ctx) {
    	var i, dispose;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fa fa-star fav-icon accent-color svelte-1jq52ul");
    			add_location(i, file$2, 88, 8, 1352);
    			dispose = listen_dev(i, "click", ctx.toggleFavorite);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(i);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(88:6) {:else}", ctx });
    	return block;
    }

    // (86:6) {#if isFavorite}
    function create_if_block$1(ctx) {
    	var i, dispose;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fa fa-star fav-icon svelte-1jq52ul");
    			add_location(i, file$2, 86, 8, 1270);
    			dispose = listen_dev(i, "click", ctx.toggleFavorite);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(i);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(86:6) {#if isFavorite}", ctx });
    	return block;
    }

    // (102:4) <Button mode="outline" type="button" on:click={() => dispatch('edit', id)}>
    function create_default_slot_1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Edit");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1.name, type: "slot", source: "(102:4) <Button mode=\"outline\" type=\"button\" on:click={() => dispatch('edit', id)}>", ctx });
    	return block;
    }

    // (105:4) <Button type="button" on:click={() => dispatch('showDetails', id)}>
    function create_default_slot(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Show Details");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(105:4) <Button type=\"button\" on:click={() => dispatch('showDetails', id)}>", ctx });
    	return block;
    }

    function create_fragment$2(ctx) {
    	var article, header, h1, t0, t1, t2, h2, t3, t4, p0, t5, t6, div0, img, t7, div1, p1, t8, t9, footer, t10, current;

    	function select_block_type(changed, ctx) {
    		if (ctx.isFavorite) return create_if_block$1;
    		return create_else_block$1;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	var button0 = new Button({
    		props: {
    		mode: "outline",
    		type: "button",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button0.$on("click", ctx.click_handler);

    	var button1 = new Button({
    		props: {
    		type: "button",
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button1.$on("click", ctx.click_handler_1);

    	const block = {
    		c: function create() {
    			article = element("article");
    			header = element("header");
    			h1 = element("h1");
    			t0 = text(ctx.name);
    			t1 = space();
    			if_block.c();
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(ctx.type);
    			t4 = space();
    			p0 = element("p");
    			t5 = text(ctx.address);
    			t6 = space();
    			div0 = element("div");
    			img = element("img");
    			t7 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t8 = text(ctx.description);
    			t9 = space();
    			footer = element("footer");
    			button0.$$.fragment.c();
    			t10 = space();
    			button1.$$.fragment.c();
    			attr_dev(h1, "class", "svelte-1jq52ul");
    			add_location(h1, file$2, 83, 4, 1221);
    			attr_dev(h2, "class", "svelte-1jq52ul");
    			add_location(h2, file$2, 91, 4, 1451);
    			attr_dev(p0, "class", "svelte-1jq52ul");
    			add_location(p0, file$2, 92, 4, 1471);
    			attr_dev(header, "class", "svelte-1jq52ul");
    			add_location(header, file$2, 82, 2, 1208);
    			attr_dev(img, "src", ctx.imageUrl);
    			attr_dev(img, "alt", ctx.name);
    			attr_dev(img, "class", "svelte-1jq52ul");
    			add_location(img, file$2, 95, 4, 1526);
    			attr_dev(div0, "class", "image svelte-1jq52ul");
    			add_location(div0, file$2, 94, 2, 1502);
    			attr_dev(p1, "class", "svelte-1jq52ul");
    			add_location(p1, file$2, 98, 4, 1597);
    			attr_dev(div1, "class", "content svelte-1jq52ul");
    			add_location(div1, file$2, 97, 2, 1571);
    			attr_dev(footer, "class", "svelte-1jq52ul");
    			add_location(footer, file$2, 100, 2, 1629);
    			attr_dev(article, "class", "svelte-1jq52ul");
    			add_location(article, file$2, 81, 0, 1196);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, header);
    			append_dev(header, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			if_block.m(h1, null);
    			append_dev(header, t2);
    			append_dev(header, h2);
    			append_dev(h2, t3);
    			append_dev(header, t4);
    			append_dev(header, p0);
    			append_dev(p0, t5);
    			append_dev(article, t6);
    			append_dev(article, div0);
    			append_dev(div0, img);
    			append_dev(article, t7);
    			append_dev(article, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t8);
    			append_dev(article, t9);
    			append_dev(article, footer);
    			mount_component(button0, footer, null);
    			append_dev(footer, t10);
    			mount_component(button1, footer, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.name) {
    				set_data_dev(t0, ctx.name);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(h1, null);
    				}
    			}

    			if (!current || changed.type) {
    				set_data_dev(t3, ctx.type);
    			}

    			if (!current || changed.address) {
    				set_data_dev(t5, ctx.address);
    			}

    			if (!current || changed.imageUrl) {
    				attr_dev(img, "src", ctx.imageUrl);
    			}

    			if (!current || changed.name) {
    				attr_dev(img, "alt", ctx.name);
    			}

    			if (!current || changed.description) {
    				set_data_dev(t8, ctx.description);
    			}

    			var button0_changes = {};
    			if (changed.$$scope) button0_changes.$$scope = { changed, ctx };
    			button0.$set(button0_changes);

    			var button1_changes = {};
    			if (changed.$$scope) button1_changes.$$scope = { changed, ctx };
    			button1.$set(button1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);

    			transition_in(button1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(article);
    			}

    			if_block.d();

    			destroy_component(button0);

    			destroy_component(button1);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	

      let { id, name, type, imageUrl, description, address, contactEmail, isFavorite } = $$props;

      const dispatch = createEventDispatcher();

      function toggleFavorite() {
        placeStore.toggleFavorite(id);
      }

    	const writable_props = ['id', 'name', 'type', 'imageUrl', 'description', 'address', 'contactEmail', 'isFavorite'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<PlaceItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch('edit', id);

    	const click_handler_1 = () => dispatch('showDetails', id);

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('imageUrl' in $$props) $$invalidate('imageUrl', imageUrl = $$props.imageUrl);
    		if ('description' in $$props) $$invalidate('description', description = $$props.description);
    		if ('address' in $$props) $$invalidate('address', address = $$props.address);
    		if ('contactEmail' in $$props) $$invalidate('contactEmail', contactEmail = $$props.contactEmail);
    		if ('isFavorite' in $$props) $$invalidate('isFavorite', isFavorite = $$props.isFavorite);
    	};

    	$$self.$capture_state = () => {
    		return { id, name, type, imageUrl, description, address, contactEmail, isFavorite };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('imageUrl' in $$props) $$invalidate('imageUrl', imageUrl = $$props.imageUrl);
    		if ('description' in $$props) $$invalidate('description', description = $$props.description);
    		if ('address' in $$props) $$invalidate('address', address = $$props.address);
    		if ('contactEmail' in $$props) $$invalidate('contactEmail', contactEmail = $$props.contactEmail);
    		if ('isFavorite' in $$props) $$invalidate('isFavorite', isFavorite = $$props.isFavorite);
    	};

    	return {
    		id,
    		name,
    		type,
    		imageUrl,
    		description,
    		address,
    		contactEmail,
    		isFavorite,
    		dispatch,
    		toggleFavorite,
    		click_handler,
    		click_handler_1
    	};
    }

    class PlaceItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, ["id", "name", "type", "imageUrl", "description", "address", "contactEmail", "isFavorite"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "PlaceItem", options, id: create_fragment$2.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console_1.warn("<PlaceItem> was created without expected prop 'id'");
    		}
    		if (ctx.name === undefined && !('name' in props)) {
    			console_1.warn("<PlaceItem> was created without expected prop 'name'");
    		}
    		if (ctx.type === undefined && !('type' in props)) {
    			console_1.warn("<PlaceItem> was created without expected prop 'type'");
    		}
    		if (ctx.imageUrl === undefined && !('imageUrl' in props)) {
    			console_1.warn("<PlaceItem> was created without expected prop 'imageUrl'");
    		}
    		if (ctx.description === undefined && !('description' in props)) {
    			console_1.warn("<PlaceItem> was created without expected prop 'description'");
    		}
    		if (ctx.address === undefined && !('address' in props)) {
    			console_1.warn("<PlaceItem> was created without expected prop 'address'");
    		}
    		if (ctx.contactEmail === undefined && !('contactEmail' in props)) {
    			console_1.warn("<PlaceItem> was created without expected prop 'contactEmail'");
    		}
    		if (ctx.isFavorite === undefined && !('isFavorite' in props)) {
    			console_1.warn("<PlaceItem> was created without expected prop 'isFavorite'");
    		}
    	}

    	get id() {
    		throw new Error("<PlaceItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<PlaceItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<PlaceItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<PlaceItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<PlaceItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<PlaceItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imageUrl() {
    		throw new Error("<PlaceItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageUrl(value) {
    		throw new Error("<PlaceItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<PlaceItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<PlaceItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get address() {
    		throw new Error("<PlaceItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set address(value) {
    		throw new Error("<PlaceItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get contactEmail() {
    		throw new Error("<PlaceItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set contactEmail(value) {
    		throw new Error("<PlaceItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isFavorite() {
    		throw new Error("<PlaceItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isFavorite(value) {
    		throw new Error("<PlaceItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/places/PlacesView.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/places/PlacesView.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.place = list[i];
    	return child_ctx;
    }

    // (30:2) <Button>
    function create_default_slot$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Add New Place");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(30:2) <Button>", ctx });
    	return block;
    }

    // (33:2) {#each places as place}
    function create_each_block(ctx) {
    	var current;

    	var placeitem_spread_levels = [
    		ctx.place
    	];

    	let placeitem_props = {};
    	for (var i = 0; i < placeitem_spread_levels.length; i += 1) {
    		placeitem_props = assign(placeitem_props, placeitem_spread_levels[i]);
    	}
    	var placeitem = new PlaceItem({ props: placeitem_props, $$inline: true });
    	placeitem.$on("showDetails", ctx.showDetails_handler);
    	placeitem.$on("edit", ctx.edit_handler);

    	const block = {
    		c: function create() {
    			placeitem.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(placeitem, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var placeitem_changes = (changed.places) ? get_spread_update(placeitem_spread_levels, [
    									get_spread_object(ctx.place)
    								]) : {};
    			placeitem.$set(placeitem_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(placeitem.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(placeitem.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(placeitem, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(33:2) {#each places as place}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var section0, t, section1, current;

    	var button = new Button({
    		props: {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	let each_value = ctx.places;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			button.$$.fragment.c();
    			t = space();
    			section1 = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(section0, "class", "place-view-control svelte-5fqiye");
    			add_location(section0, file$3, 28, 0, 456);
    			attr_dev(section1, "id", "places");
    			attr_dev(section1, "class", "svelte-5fqiye");
    			add_location(section1, file$3, 31, 0, 537);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			mount_component(button, section0, null);
    			insert_dev(target, t, anchor);
    			insert_dev(target, section1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section1, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var button_changes = {};
    			if (changed.$$scope) button_changes.$$scope = { changed, ctx };
    			button.$set(button_changes);

    			if (changed.places) {
    				each_value = ctx.places;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(section1, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);

    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section0);
    			}

    			destroy_component(button);

    			if (detaching) {
    				detach_dev(t);
    				detach_dev(section1);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

      let { places } = $$props;

    	const writable_props = ['places'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<PlacesView> was created with unknown prop '${key}'`);
    	});

    	function showDetails_handler(event) {
    		bubble($$self, event);
    	}

    	function edit_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ('places' in $$props) $$invalidate('places', places = $$props.places);
    	};

    	$$self.$capture_state = () => {
    		return { places };
    	};

    	$$self.$inject_state = $$props => {
    		if ('places' in $$props) $$invalidate('places', places = $$props.places);
    	};

    	return {
    		places,
    		showDetails_handler,
    		edit_handler
    	};
    }

    class PlacesView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, ["places"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "PlacesView", options, id: create_fragment$3.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.places === undefined && !('places' in props)) {
    			console.warn("<PlacesView> was created without expected prop 'places'");
    		}
    	}

    	get places() {
    		throw new Error("<PlacesView>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set places(value) {
    		throw new Error("<PlacesView>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/places/PlaceDetails.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/places/PlaceDetails.svelte";

    // (71:4) <Button href="mailto:{selectedPlace.contactEmail}">
    function create_default_slot_1$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Contact");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$1.name, type: "slot", source: "(71:4) <Button href=\"mailto:{selectedPlace.contactEmail}\">", ctx });
    	return block;
    }

    // (72:4) <Button type="button" mode="outline" on:click={() => dispatch('close')}>
    function create_default_slot$2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Close");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$2.name, type: "slot", source: "(72:4) <Button type=\"button\" mode=\"outline\" on:click={() => dispatch('close')}>", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var section, div0, img, img_src_value, img_alt_value, t0, div1, h1, t1_value = ctx.selectedPlace.name + "", t1, t2, h2, t3_value = ctx.selectedPlace.type + "", t3, t4, t5_value = ctx.selectedPlace.address + "", t5, t6, p, t7_value = ctx.selectedPlace.description + "", t7, t8, t9, current;

    	var button0 = new Button({
    		props: {
    		href: "mailto:" + ctx.selectedPlace.contactEmail,
    		$$slots: { default: [create_default_slot_1$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var button1 = new Button({
    		props: {
    		type: "button",
    		mode: "outline",
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button1.$on("click", ctx.click_handler);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(t3_value);
    			t4 = text(" - ");
    			t5 = text(t5_value);
    			t6 = space();
    			p = element("p");
    			t7 = text(t7_value);
    			t8 = space();
    			button0.$$.fragment.c();
    			t9 = space();
    			button1.$$.fragment.c();
    			attr_dev(img, "src", img_src_value = ctx.selectedPlace.imageUrl);
    			attr_dev(img, "alt", img_alt_value = ctx.selectedPlace.name);
    			attr_dev(img, "class", "svelte-10utsu1");
    			add_location(img, file$4, 64, 4, 925);
    			attr_dev(div0, "class", "image svelte-10utsu1");
    			add_location(div0, file$4, 63, 2, 901);
    			attr_dev(h1, "class", "svelte-10utsu1");
    			add_location(h1, file$4, 67, 4, 1024);
    			attr_dev(h2, "class", "svelte-10utsu1");
    			add_location(h2, file$4, 68, 4, 1058);
    			attr_dev(p, "class", "svelte-10utsu1");
    			add_location(p, file$4, 69, 4, 1118);
    			attr_dev(div1, "class", "content svelte-10utsu1");
    			add_location(div1, file$4, 66, 2, 998);
    			attr_dev(section, "class", "svelte-10utsu1");
    			add_location(section, file$4, 62, 0, 889);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, img);
    			append_dev(section, t0);
    			append_dev(section, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, h2);
    			append_dev(h2, t3);
    			append_dev(h2, t4);
    			append_dev(h2, t5);
    			append_dev(div1, t6);
    			append_dev(div1, p);
    			append_dev(p, t7);
    			append_dev(div1, t8);
    			mount_component(button0, div1, null);
    			append_dev(div1, t9);
    			mount_component(button1, div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.selectedPlace) && img_src_value !== (img_src_value = ctx.selectedPlace.imageUrl)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if ((!current || changed.selectedPlace) && img_alt_value !== (img_alt_value = ctx.selectedPlace.name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if ((!current || changed.selectedPlace) && t1_value !== (t1_value = ctx.selectedPlace.name + "")) {
    				set_data_dev(t1, t1_value);
    			}

    			if ((!current || changed.selectedPlace) && t3_value !== (t3_value = ctx.selectedPlace.type + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if ((!current || changed.selectedPlace) && t5_value !== (t5_value = ctx.selectedPlace.address + "")) {
    				set_data_dev(t5, t5_value);
    			}

    			if ((!current || changed.selectedPlace) && t7_value !== (t7_value = ctx.selectedPlace.description + "")) {
    				set_data_dev(t7, t7_value);
    			}

    			var button0_changes = {};
    			if (changed.selectedPlace) button0_changes.href = "mailto:" + ctx.selectedPlace.contactEmail;
    			if (changed.$$scope) button0_changes.$$scope = { changed, ctx };
    			button0.$set(button0_changes);

    			var button1_changes = {};
    			if (changed.$$scope) button1_changes.$$scope = { changed, ctx };
    			button1.$set(button1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);

    			transition_in(button1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			destroy_component(button0);

    			destroy_component(button1);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	

      let { id } = $$props;

      let selectedPlace;

      const unsubscribe = placeStore.subscribe(items => {
        $$invalidate('selectedPlace', selectedPlace = items.find(i => i.id === id));
      });

      const dispatch = createEventDispatcher();

      onDestroy(() => {
        unsubscribe();
      });

    	const writable_props = ['id'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<PlaceDetails> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch('close');

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	$$self.$capture_state = () => {
    		return { id, selectedPlace };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('selectedPlace' in $$props) $$invalidate('selectedPlace', selectedPlace = $$props.selectedPlace);
    	};

    	return {
    		id,
    		selectedPlace,
    		dispatch,
    		click_handler
    	};
    }

    class PlaceDetails extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, ["id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "PlaceDetails", options, id: create_fragment$4.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<PlaceDetails> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<PlaceDetails>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<PlaceDetails>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/TextInput.svelte generated by Svelte v3.12.1 */
    const { console: console_1$1 } = globals;

    const file$5 = "src/UI/TextInput.svelte";

    // (67:2) {:else}
    function create_else_block$2(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", ctx.type);
    			attr_dev(input, "id", ctx.id);
    			input.value = ctx.value;
    			attr_dev(input, "class", "svelte-w7gyuh");
    			toggle_class(input, "invalid", !ctx.valid && ctx.touched);
    			add_location(input, file$5, 67, 4, 1186);

    			dispose = [
    				listen_dev(input, "input", ctx.input_handler),
    				listen_dev(input, "blur", ctx.blur_handler_1)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.type) {
    				attr_dev(input, "type", ctx.type);
    			}

    			if (changed.id) {
    				attr_dev(input, "id", ctx.id);
    			}

    			if (changed.value) {
    				prop_dev(input, "value", ctx.value);
    			}

    			if ((changed.valid || changed.touched)) {
    				toggle_class(input, "invalid", !ctx.valid && ctx.touched);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$2.name, type: "else", source: "(67:2) {:else}", ctx });
    	return block;
    }

    // (60:2) {#if controlType === 'textarea'}
    function create_if_block_1(ctx) {
    	var textarea, dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "rows", ctx.rows);
    			attr_dev(textarea, "id", ctx.id);
    			attr_dev(textarea, "class", "svelte-w7gyuh");
    			toggle_class(textarea, "invalid", !ctx.valid && ctx.touched);
    			add_location(textarea, file$5, 60, 4, 1039);

    			dispose = [
    				listen_dev(textarea, "input", ctx.textarea_input_handler),
    				listen_dev(textarea, "blur", ctx.blur_handler)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);

    			set_input_value(textarea, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(textarea, ctx.value);

    			if (changed.rows) {
    				attr_dev(textarea, "rows", ctx.rows);
    			}

    			if (changed.id) {
    				attr_dev(textarea, "id", ctx.id);
    			}

    			if ((changed.valid || changed.touched)) {
    				toggle_class(textarea, "invalid", !ctx.valid && ctx.touched);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(textarea);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(60:2) {#if controlType === 'textarea'}", ctx });
    	return block;
    }

    // (76:2) {#if validityMessage && !valid && touched}
    function create_if_block$2(ctx) {
    	var p, t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(ctx.validityMessage);
    			attr_dev(p, "class", "error-message svelte-w7gyuh");
    			add_location(p, file$5, 76, 4, 1385);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},

    		p: function update(changed, ctx) {
    			if (changed.validityMessage) {
    				set_data_dev(t, ctx.validityMessage);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(76:2) {#if validityMessage && !valid && touched}", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var div, label_1, t0, t1, t2;

    	function select_block_type(changed, ctx) {
    		if (ctx.controlType === 'textarea') return create_if_block_1;
    		return create_else_block$2;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	var if_block1 = (ctx.validityMessage && !ctx.valid && ctx.touched) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			label_1 = element("label");
    			t0 = text(ctx.label);
    			t1 = space();
    			if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(label_1, "for", ctx.id);
    			attr_dev(label_1, "class", "svelte-w7gyuh");
    			add_location(label_1, file$5, 58, 2, 968);
    			attr_dev(div, "class", "form-control svelte-w7gyuh");
    			add_location(div, file$5, 57, 0, 939);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label_1);
    			append_dev(label_1, t0);
    			append_dev(div, t1);
    			if_block0.m(div, null);
    			append_dev(div, t2);
    			if (if_block1) if_block1.m(div, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.label) {
    				set_data_dev(t0, ctx.label);
    			}

    			if (changed.id) {
    				attr_dev(label_1, "for", ctx.id);
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			}

    			if (ctx.validityMessage && !ctx.valid && ctx.touched) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { controlType = null, id, label, rows = null, value, type = "text", valid = true, validityMessage = "" } = $$props;

      let touched = false;
      console.log(controlType);

    	const writable_props = ['controlType', 'id', 'label', 'rows', 'value', 'type', 'valid', 'validityMessage'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1$1.warn(`<TextInput> was created with unknown prop '${key}'`);
    	});

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function textarea_input_handler() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	const blur_handler = () => ($$invalidate('touched', touched = true));

    	const blur_handler_1 = () => ($$invalidate('touched', touched = true));

    	$$self.$set = $$props => {
    		if ('controlType' in $$props) $$invalidate('controlType', controlType = $$props.controlType);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('label' in $$props) $$invalidate('label', label = $$props.label);
    		if ('rows' in $$props) $$invalidate('rows', rows = $$props.rows);
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('valid' in $$props) $$invalidate('valid', valid = $$props.valid);
    		if ('validityMessage' in $$props) $$invalidate('validityMessage', validityMessage = $$props.validityMessage);
    	};

    	$$self.$capture_state = () => {
    		return { controlType, id, label, rows, value, type, valid, validityMessage, touched };
    	};

    	$$self.$inject_state = $$props => {
    		if ('controlType' in $$props) $$invalidate('controlType', controlType = $$props.controlType);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('label' in $$props) $$invalidate('label', label = $$props.label);
    		if ('rows' in $$props) $$invalidate('rows', rows = $$props.rows);
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('valid' in $$props) $$invalidate('valid', valid = $$props.valid);
    		if ('validityMessage' in $$props) $$invalidate('validityMessage', validityMessage = $$props.validityMessage);
    		if ('touched' in $$props) $$invalidate('touched', touched = $$props.touched);
    	};

    	return {
    		controlType,
    		id,
    		label,
    		rows,
    		value,
    		type,
    		valid,
    		validityMessage,
    		touched,
    		input_handler,
    		textarea_input_handler,
    		blur_handler,
    		blur_handler_1
    	};
    }

    class TextInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, ["controlType", "id", "label", "rows", "value", "type", "valid", "validityMessage"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "TextInput", options, id: create_fragment$5.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console_1$1.warn("<TextInput> was created without expected prop 'id'");
    		}
    		if (ctx.label === undefined && !('label' in props)) {
    			console_1$1.warn("<TextInput> was created without expected prop 'label'");
    		}
    		if (ctx.value === undefined && !('value' in props)) {
    			console_1$1.warn("<TextInput> was created without expected prop 'value'");
    		}
    	}

    	get controlType() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controlType(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valid() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valid(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get validityMessage() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set validityMessage(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/Modal.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/UI/Modal.svelte";

    const get_footer_slot_changes = () => ({});
    const get_footer_slot_context = () => ({});

    // (64:6) <Button on:click={() => dispatch('onModalclose')}>
    function create_default_slot$3(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Close");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$3.name, type: "slot", source: "(64:6) <Button on:click={() => dispatch('onModalclose')}>", ctx });
    	return block;
    }

    function create_fragment$6(ctx) {
    	var div0, t0, div2, h1, t1, t2, div1, t3, footer, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const footer_slot_template = ctx.$$slots.footer;
    	const footer_slot = create_slot(footer_slot_template, ctx, get_footer_slot_context);

    	var button = new Button({
    		props: {
    		$$slots: { default: [create_default_slot$3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button.$on("click", ctx.click_handler);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			t1 = text(ctx.title);
    			t2 = space();
    			div1 = element("div");

    			if (default_slot) default_slot.c();
    			t3 = space();
    			footer = element("footer");

    			if (!footer_slot) {
    				button.$$.fragment.c();
    			}

    			if (footer_slot) footer_slot.c();
    			attr_dev(div0, "class", "modal-back svelte-1fw399");
    			add_location(div0, file$6, 55, 0, 916);
    			attr_dev(h1, "class", "svelte-1fw399");
    			add_location(h1, file$6, 57, 2, 965);

    			attr_dev(div1, "class", "content svelte-1fw399");
    			add_location(div1, file$6, 58, 2, 984);

    			attr_dev(footer, "class", "svelte-1fw399");
    			add_location(footer, file$6, 61, 2, 1030);
    			attr_dev(div2, "class", "modal svelte-1fw399");
    			add_location(div2, file$6, 56, 0, 943);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div1_nodes);

    			if (footer_slot) footer_slot.l(footer_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(h1, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append_dev(div2, t3);
    			append_dev(div2, footer);

    			if (!footer_slot) {
    				mount_component(button, footer, null);
    			}

    			else {
    				footer_slot.m(footer, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t1, ctx.title);
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if (!footer_slot) {
    				var button_changes = {};
    				if (changed.$$scope) button_changes.$$scope = { changed, ctx };
    				button.$set(button_changes);
    			}

    			if (footer_slot && footer_slot.p && changed.$$scope) {
    				footer_slot.p(
    					get_slot_changes(footer_slot_template, ctx, changed, get_footer_slot_changes),
    					get_slot_context(footer_slot_template, ctx, get_footer_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			transition_in(button.$$.fragment, local);

    			transition_in(footer_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(button.$$.fragment, local);
    			transition_out(footer_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t0);
    				detach_dev(div2);
    			}

    			if (default_slot) default_slot.d(detaching);

    			if (!footer_slot) {
    				destroy_component(button);
    			}

    			if (footer_slot) footer_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	
      let { title } = $$props;

      const dispatch = createEventDispatcher();

    	const writable_props = ['title'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	const click_handler = () => dispatch('onModalclose');

    	$$self.$set = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { title };
    	};

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    	};

    	return {
    		title,
    		dispatch,
    		click_handler,
    		$$slots,
    		$$scope
    	};
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, ["title"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Modal", options, id: create_fragment$6.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<Modal> was created without expected prop 'title'");
    		}
    	}

    	get title() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/places/Editplace.svelte generated by Svelte v3.12.1 */

    const file$7 = "src/places/Editplace.svelte";

    // (83:4) <Button mode="outline" on:click={() => dispatch('onModalclose')}>
    function create_default_slot_2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Close");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2.name, type: "slot", source: "(83:4) <Button mode=\"outline\" on:click={() => dispatch('onModalclose')}>", ctx });
    	return block;
    }

    // (86:4) <Button on:click={() => dispatch('onModalclose')}>
    function create_default_slot_1$2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Save");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$2.name, type: "slot", source: "(86:4) <Button on:click={() => dispatch('onModalclose')}>", ctx });
    	return block;
    }

    // (82:2) <div slot="footer">
    function create_footer_slot(ctx) {
    	var div, t, current;

    	var button0 = new Button({
    		props: {
    		mode: "outline",
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button0.$on("click", ctx.click_handler);

    	var button1 = new Button({
    		props: {
    		$$slots: { default: [create_default_slot_1$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button1.$on("click", ctx.click_handler_1);

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0.$$.fragment.c();
    			t = space();
    			button1.$$.fragment.c();
    			attr_dev(div, "slot", "footer");
    			add_location(div, file$7, 81, 2, 1890);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button0, div, null);
    			append_dev(div, t);
    			mount_component(button1, div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var button0_changes = {};
    			if (changed.$$scope) button0_changes.$$scope = { changed, ctx };
    			button0.$set(button0_changes);

    			var button1_changes = {};
    			if (changed.$$scope) button1_changes.$$scope = { changed, ctx };
    			button1.$set(button1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);

    			transition_in(button1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(button0);

    			destroy_component(button1);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_footer_slot.name, type: "slot", source: "(82:2) <div slot=\"footer\">", ctx });
    	return block;
    }

    // (39:0) <Modal {title} on:onModalclose>
    function create_default_slot$4(ctx) {
    	var form, t0, t1, t2, t3, t4, t5, current, dispose;

    	var textinput0 = new TextInput({
    		props: {
    		controlType: "text",
    		id: "name",
    		label: "Name",
    		value: ctx.name
    	},
    		$$inline: true
    	});
    	textinput0.$on("input", ctx.input_handler);

    	var textinput1 = new TextInput({
    		props: {
    		controlType: "text",
    		id: "type",
    		label: "Type",
    		value: ctx.type
    	},
    		$$inline: true
    	});
    	textinput1.$on("input", ctx.input_handler_1);

    	var textinput2 = new TextInput({
    		props: {
    		controlType: "textarea",
    		id: "description",
    		label: "Description",
    		rows: 3,
    		value: ctx.description
    	},
    		$$inline: true
    	});
    	textinput2.$on("bind", ctx.description);

    	var textinput3 = new TextInput({
    		props: {
    		controlType: "text",
    		id: "imageUrl",
    		label: "imageUrl",
    		value: ctx.imageUrl
    	},
    		$$inline: true
    	});
    	textinput3.$on("input", ctx.input_handler_2);

    	var textinput4 = new TextInput({
    		props: {
    		controlType: "text",
    		id: "address",
    		label: "Address",
    		value: ctx.address
    	},
    		$$inline: true
    	});
    	textinput4.$on("input", ctx.input_handler_3);

    	var textinput5 = new TextInput({
    		props: {
    		controlType: "text",
    		type: "email",
    		id: "contactEmail",
    		label: "Email",
    		value: ctx.contactEmail
    	},
    		$$inline: true
    	});
    	textinput5.$on("input", ctx.input_handler_4);

    	const block = {
    		c: function create() {
    			form = element("form");
    			textinput0.$$.fragment.c();
    			t0 = space();
    			textinput1.$$.fragment.c();
    			t1 = space();
    			textinput2.$$.fragment.c();
    			t2 = space();
    			textinput3.$$.fragment.c();
    			t3 = space();
    			textinput4.$$.fragment.c();
    			t4 = space();
    			textinput5.$$.fragment.c();
    			t5 = space();
    			add_location(form, file$7, 39, 2, 854);
    			dispose = listen_dev(form, "submit", submitForm);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			mount_component(textinput0, form, null);
    			append_dev(form, t0);
    			mount_component(textinput1, form, null);
    			append_dev(form, t1);
    			mount_component(textinput2, form, null);
    			append_dev(form, t2);
    			mount_component(textinput3, form, null);
    			append_dev(form, t3);
    			mount_component(textinput4, form, null);
    			append_dev(form, t4);
    			mount_component(textinput5, form, null);
    			insert_dev(target, t5, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var textinput0_changes = {};
    			if (changed.name) textinput0_changes.value = ctx.name;
    			textinput0.$set(textinput0_changes);

    			var textinput1_changes = {};
    			if (changed.type) textinput1_changes.value = ctx.type;
    			textinput1.$set(textinput1_changes);

    			var textinput2_changes = {};
    			if (changed.description) textinput2_changes.value = ctx.description;
    			textinput2.$set(textinput2_changes);

    			var textinput3_changes = {};
    			if (changed.imageUrl) textinput3_changes.value = ctx.imageUrl;
    			textinput3.$set(textinput3_changes);

    			var textinput4_changes = {};
    			if (changed.address) textinput4_changes.value = ctx.address;
    			textinput4.$set(textinput4_changes);

    			var textinput5_changes = {};
    			if (changed.contactEmail) textinput5_changes.value = ctx.contactEmail;
    			textinput5.$set(textinput5_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(textinput0.$$.fragment, local);

    			transition_in(textinput1.$$.fragment, local);

    			transition_in(textinput2.$$.fragment, local);

    			transition_in(textinput3.$$.fragment, local);

    			transition_in(textinput4.$$.fragment, local);

    			transition_in(textinput5.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			transition_out(textinput3.$$.fragment, local);
    			transition_out(textinput4.$$.fragment, local);
    			transition_out(textinput5.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(form);
    			}

    			destroy_component(textinput0);

    			destroy_component(textinput1);

    			destroy_component(textinput2);

    			destroy_component(textinput3);

    			destroy_component(textinput4);

    			destroy_component(textinput5);

    			if (detaching) {
    				detach_dev(t5);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$4.name, type: "slot", source: "(39:0) <Modal {title} on:onModalclose>", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		title: title,
    		$$slots: {
    		default: [create_default_slot$4],
    		footer: [create_footer_slot]
    	},
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("onModalclose", ctx.onModalclose_handler);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var modal_changes = {};
    			if (changed.$$scope || changed.contactEmail || changed.address || changed.imageUrl || changed.description || changed.type || changed.name) modal_changes.$$scope = { changed, ctx };
    			modal.$set(modal_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    let title = "Edit Place";

    function submitForm(event) {}

    function instance$6($$self, $$props, $$invalidate) {
    	
      const dispatch = createEventDispatcher();

      let { id = null } = $$props;

      let name = "";
      let type = "";
      let description = "";
      let imageUrl = "";
      let address = "";
      let contactEmail = "";

      if (id) {
        const unsubscribe = placeStore.subscribe(places => {
          const place = places.find(p => p.id === id);
          if (place) {
            ($$invalidate('name', { name, type, description, imageUrl, address, contactEmail } = place, name, $$invalidate('type', type), $$invalidate('description', description), $$invalidate('imageUrl', imageUrl), $$invalidate('address', address), $$invalidate('contactEmail', contactEmail)));
          }
        });
        onDestroy(() => {
          unsubscribe();
        });
      }

    	const writable_props = ['id'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Editplace> was created with unknown prop '${key}'`);
    	});

    	function onModalclose_handler(event) {
    		bubble($$self, event);
    	}

    	const input_handler = (event) => ($$invalidate('name', name = event.target.value));

    	const input_handler_1 = (event) => ($$invalidate('type', type = event.target.value));

    	const input_handler_2 = (event) => ($$invalidate('imageUrl', imageUrl = event.target.value));

    	const input_handler_3 = (event) => ($$invalidate('address', address = event.target.value));

    	const input_handler_4 = (event) => ($$invalidate('contactEmail', contactEmail = event.target.value));

    	const click_handler = () => dispatch('onModalclose');

    	const click_handler_1 = () => dispatch('onModalclose');

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	$$self.$capture_state = () => {
    		return { title, id, name, type, description, imageUrl, address, contactEmail };
    	};

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('description' in $$props) $$invalidate('description', description = $$props.description);
    		if ('imageUrl' in $$props) $$invalidate('imageUrl', imageUrl = $$props.imageUrl);
    		if ('address' in $$props) $$invalidate('address', address = $$props.address);
    		if ('contactEmail' in $$props) $$invalidate('contactEmail', contactEmail = $$props.contactEmail);
    	};

    	return {
    		dispatch,
    		id,
    		name,
    		type,
    		description,
    		imageUrl,
    		address,
    		contactEmail,
    		onModalclose_handler,
    		input_handler,
    		input_handler_1,
    		input_handler_2,
    		input_handler_3,
    		input_handler_4,
    		click_handler,
    		click_handler_1
    	};
    }

    class Editplace extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, ["id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Editplace", options, id: create_fragment$7.name });
    	}

    	get id() {
    		throw new Error("<Editplace>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Editplace>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/App.svelte";

    // (48:37) 
    function create_if_block_2(ctx) {
    	var current;

    	var editplace = new Editplace({
    		props: { id: ctx.placeId },
    		$$inline: true
    	});
    	editplace.$on("onModalclose", ctx.onEditCancel);

    	const block = {
    		c: function create() {
    			editplace.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(editplace, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var editplace_changes = {};
    			if (changed.placeId) editplace_changes.id = ctx.placeId;
    			editplace.$set(editplace_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(editplace.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(editplace.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(editplace, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(48:37) ", ctx });
    	return block;
    }

    // (46:40) 
    function create_if_block_1$1(ctx) {
    	var current;

    	var placedetails = new PlaceDetails({
    		props: { id: ctx.placeId },
    		$$inline: true
    	});
    	placedetails.$on("close", ctx.closeDetails);

    	const block = {
    		c: function create() {
    			placedetails.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(placedetails, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var placedetails_changes = {};
    			if (changed.placeId) placedetails_changes.id = ctx.placeId;
    			placedetails.$set(placedetails_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(placedetails.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(placedetails.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(placedetails, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(46:40) ", ctx });
    	return block;
    }

    // (41:2) {#if mainView === 'places-view'}
    function create_if_block$3(ctx) {
    	var current;

    	var placesview = new PlacesView({
    		props: { places: ctx.$places },
    		$$inline: true
    	});
    	placesview.$on("showDetails", ctx.showDetails);
    	placesview.$on("edit", ctx.editClicked);

    	const block = {
    		c: function create() {
    			placesview.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(placesview, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var placesview_changes = {};
    			if (changed.$places) placesview_changes.places = ctx.$places;
    			placesview.$set(placesview_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(placesview.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(placesview.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(placesview, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(41:2) {#if mainView === 'places-view'}", ctx });
    	return block;
    }

    function create_fragment$8(ctx) {
    	var t, main, current_block_type_index, if_block, current;

    	var header = new Header({ $$inline: true });

    	var if_block_creators = [
    		create_if_block$3,
    		create_if_block_1$1,
    		create_if_block_2
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.mainView === 'places-view') return 0;
    		if (ctx.mainView === 'details-view') return 1;
    		if (ctx.mainView === 'edit-view') return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			header.$$.fragment.c();
    			t = space();
    			main = element("main");
    			if (if_block) if_block.c();
    			attr_dev(main, "class", "svelte-1r5xu04");
    			add_location(main, file$8, 39, 0, 769);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, main, anchor);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(main, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);

    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(header, detaching);

    			if (detaching) {
    				detach_dev(t);
    				detach_dev(main);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $places;

    	validate_store(placeStore, 'places');
    	component_subscribe($$self, placeStore, $$value => { $places = $$value; $$invalidate('$places', $places); });

    	

      let mainView = "places-view";
      let placeId;

      function showDetails(event) {
        console.log(event);
        $$invalidate('placeId', placeId = event.detail);
        $$invalidate('mainView', mainView = "details-view");
      }

      function closeDetails() {
        $$invalidate('mainView', mainView = "places-view");
        $$invalidate('placeId', placeId = null);
      }

      function editClicked(event) {
        $$invalidate('placeId', placeId = event.detail);
        $$invalidate('mainView', mainView = "edit-view");
      }

      function onEditCancel() {
        $$invalidate('mainView', mainView = "places-view");
        $$invalidate('placeId', placeId = null);
      }

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('mainView' in $$props) $$invalidate('mainView', mainView = $$props.mainView);
    		if ('placeId' in $$props) $$invalidate('placeId', placeId = $$props.placeId);
    		if ('$places' in $$props) placeStore.set($places);
    	};

    	return {
    		mainView,
    		placeId,
    		showDetails,
    		closeDetails,
    		editClicked,
    		onEditCancel,
    		$places
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$8.name });
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
