import { acknowledgedAlert, activeMelting, alert, alerts, initialized, meltings, meltingShop, plant, requests, segments } from '@yarkivaev/scada';
import testSensor from './testSensor.js';

/**
 * Test plant factory for integration testing.
 * Creates a plant with one shop and one machine.
 *
 * @param {function} meltingMachine - factory function for creating melting machines
 * @returns {object} plant with shops property and init method
 */
export default function testPlant(meltingMachine) {
    const history = alerts(alert, acknowledgedAlert);
    const sensors = {
        voltage: testSensor('Voltage', 'V', 380),
        cosphi: testSensor('Power Factor', 'cos(φ)', 0.85)
    };
    const machine = meltingMachine('icht1', sensors, history);
    const decorated = {
        ...machine,
        name: machine.name,
        segments: segments(),
        requests: requests(),
        init: machine.init
    };
    const shop = meltingShop('meltingShop', initialized({ icht1: decorated }, Object.values), meltings(activeMelting), history);
    return plant(initialized({ meltingShop: shop }, Object.values));
}
