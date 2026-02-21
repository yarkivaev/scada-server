/**
 * Creates a fake plant object for testing route factories.
 * Simulates the scada domain structure.
 *
 * @param {object} config - configuration for the fake plant
 * @returns {object} fake plant with shops, machines, sensors, alerts, meltings
 */
export default function fakePlant(config = {}) {
    const machineId = config.machineId || `machine${Math.random()}`;
    const alertItems = config.alerts || [];
    const meltingItems = config.meltings || [];
    const voltageData = config.voltage || [];
    const cosphiData = config.cosphi || [];
    const segmentItems = config.segments || [];
    const requestItems = config.requests || [];
    const subscribers = [];
    const alertSubscribers = [];
    const segmentSubscribers = [];
    const requestSubscribers = [];
    function fakeSensor(data, unit, sensorName) {
        return {
            name() {
                return sensorName;
            },
            measurements(range, step) {
                return data.length > 0 ? data : [{ timestamp: new Date(), value: Math.random(), unit }];
            },
            stream(since, step, callback) {
                const items = this.measurements({ start: since, end: new Date() }, step);
                items.forEach((item) => {
                    callback(item);
                });
                const timer = setInterval(() => {
                    callback({ timestamp: new Date(), value: Math.random(), unit });
                }, step);
                return {
                    cancel() {
                        clearInterval(timer);
                    }
                };
            }
        };
    }
    let machineWeight = config.weight || 0;
    const machine = {
        name() {
            return machineId;
        },
        sensors: {
            voltage: fakeSensor(voltageData, 'V', 'Voltage'),
            cosphi: fakeSensor(cosphiData, 'cos(φ)', 'Power Factor')
        },
        alerts() {
            return alertItems;
        },
        chronology() {
            return {
                get(query) {
                    if (query && query.type === 'current') {
                        return { weight: machineWeight };
                    }
                    return { weight: machineWeight };
                }
            };
        },
        reset(amount) {
            machineWeight = amount;
        },
        load(amount) {
            machineWeight += amount;
        },
        dispense(amount) {
            machineWeight -= amount;
        }
    };
    const meltings = {
        query(options) {
            const opts = options !== undefined ? options : {};
            if (opts.stream !== undefined) {
                subscribers.push(opts.stream);
                return {
                    cancel() {
                        const index = subscribers.indexOf(opts.stream);
                        subscribers.splice(index, 1);
                    }
                };
            }
            if (opts.id !== undefined) {
                const item = meltingItems.find((m) => {
                    return m.id() === opts.id;
                });
                return item !== undefined ? item : undefined;
            }
            if (opts.machine !== undefined) {
                return meltingItems.filter((item) => {
                    return item.machineId === opts.machine.name();
                });
            }
            return meltingItems.filter((item) => {
                return item.chronology().get().end !== undefined;
            });
        },
        add(m, data) {
            let meltingEnd = data && data.end ? new Date(data.end) : undefined;
            const meltingStart = data && data.start ? new Date(data.start) : new Date();
            const meltingId = `m${meltingItems.length + 1}`;
            let meltingData = { initial: 0, weight: 0, loaded: 0, dispensed: 0 };
            const melting = {
                id() {
                    return meltingId;
                },
                machineId: m.name(),
                chronology() {
                    return {
                        get() {
                            const result = { start: meltingStart, ...meltingData };
                            if (meltingEnd !== undefined) {
                                result.end = meltingEnd;
                            }
                            return result;
                        }
                    };
                },
                stop() {
                    meltingEnd = new Date();
                    return melting;
                },
                update(updated) {
                    meltingData = { ...meltingData, ...updated };
                    return melting;
                }
            };
            meltingItems.push(melting);
            return melting;
        },
        notify(event) {
            subscribers.forEach((cb) => {
                cb(event);
            });
        }
    };
    const alerts = {
        all() {
            return alertItems;
        },
        stream(callback) {
            alertSubscribers.push(callback);
            return {
                cancel() {
                    const index = alertSubscribers.indexOf(callback);
                    alertSubscribers.splice(index, 1);
                }
            };
        },
        notify(event) {
            alertSubscribers.forEach((cb) => {
                cb(event);
            });
        }
    };
    const segments = {
        query(options) {
            if (options && options.machine) {
                return segmentItems.filter((s) => {
                    return s.machine === options.machine;
                });
            }
            return segmentItems;
        },
        stream(callback) {
            segmentSubscribers.push(callback);
            return {
                cancel() {
                    const index = segmentSubscribers.indexOf(callback);
                    segmentSubscribers.splice(index, 1);
                }
            };
        },
        notify(event) {
            segmentSubscribers.forEach((cb) => {
                cb(event);
            });
        }
    };
    const requests = {
        query(options) {
            if (options && options.machine) {
                return requestItems.filter((r) => {
                    return r.machine === options.machine && !r.resolved;
                });
            }
            return requestItems;
        },
        respond(requestId, body) {
            const item = requestItems.find((r) => {
                return r.id === requestId;
            });
            if (!item) {
                return undefined;
            }
            item.resolved = true;
            return { id: requestId, ...body };
        },
        stream(callback) {
            requestSubscribers.push(callback);
            return {
                cancel() {
                    const index = requestSubscribers.indexOf(callback);
                    requestSubscribers.splice(index, 1);
                }
            };
        },
        notify(event) {
            requestSubscribers.forEach((cb) => {
                cb(event);
            });
        }
    };
    const shop = {
        name() {
            return 'testShop';
        },
        machines: {
            init() {},
            get() {
                return { [machineId]: machine };
            }
        },
        meltings,
        alerts,
        segments,
        requests
    };
    return {
        shops: {
            init() {},
            get() {
                return { testShop: shop };
            }
        },
        init() {},
        machine,
        meltings,
        alerts,
        segments,
        requests,
        addAlert(alert) {
            alertItems.push(alert);
        },
        addMelting(melting) {
            meltingItems.push(melting);
        }
    };
}
