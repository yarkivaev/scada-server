import assert from 'assert';
import virtualClock from '../../src/objects/virtualClock.js';

describe('virtualClock', function() {
    it('returns current time from source when no jump occurred', function() {
        const fixed = new Date('2025-03-15T10:00:00Z');
        const clock = virtualClock(() => {return fixed});
        assert(clock().getTime() === fixed.getTime(), 'clock should return source time');
    });

    it('returns shifted time after jump to random past date', function() {
        const target = new Date(Date.now() - Math.random() * 86400000 * 30);
        const clock = virtualClock(() => {return new Date()});
        clock.jump(target);
        assert(Math.abs(clock().getTime() - target.getTime()) < 50, 'clock should be near target time');
    });

    it('returns zero offset when no jump occurred', function() {
        const clock = virtualClock(() => {return new Date()});
        assert(clock.offset() === 0, 'offset should be zero initially');
    });

    it('returns nonzero offset after jump', function() {
        const target = new Date(Date.now() - Math.random() * 86400000 * 30);
        const clock = virtualClock(() => {return new Date()});
        clock.jump(target);
        assert(clock.offset() !== 0, 'offset should be nonzero after jump');
    });

    it('returns negative offset after jump to past', function() {
        const target = new Date(Date.now() - 86400000);
        const clock = virtualClock(() => {return new Date()});
        clock.jump(target);
        assert(clock.offset() < 0, 'offset should be negative for past jump');
    });

    it('returns positive offset after jump to future', function() {
        const target = new Date(Date.now() + 86400000);
        const clock = virtualClock(() => {return new Date()});
        clock.jump(target);
        assert(clock.offset() > 0, 'offset should be positive for future jump');
    });

    it('returns current time from source after reset', function() {
        const clock = virtualClock(() => {return new Date()});
        clock.jump(new Date(Date.now() - 86400000));
        clock.reset();
        assert(Math.abs(clock().getTime() - Date.now()) < 50, 'clock should return source time after reset');
    });

    it('returns zero offset after reset', function() {
        const clock = virtualClock(() => {return new Date()});
        clock.jump(new Date(Date.now() - 86400000));
        clock.reset();
        assert(clock.offset() === 0, 'offset should be zero after reset');
    });

    it('is callable as a function', function() {
        const clock = virtualClock(() => {return new Date()});
        assert(typeof clock === 'function', 'clock should be a function');
    });

    it('advances time at real speed from jumped point', function(done) {
        this.timeout(500);
        const clock = virtualClock(() => {return new Date()});
        clock.jump(new Date(Date.now() - 86400000));
        const before = clock().getTime();
        setTimeout(() => {
            assert(clock().getTime() > before, 'clock should advance after delay');
            done();
        }, 50);
    });
});
