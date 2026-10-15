import assert from 'node:assert/strict';
import test from 'node:test';
import { runLoadBenchmark } from '../scripts/load-test';

test('load benchmark processes synthetic events within SLA bounds without drops', () => {
  const result = runLoadBenchmark(5000, 100, 1000, 100);
  assert.equal(result.totalEvents, 5000);
  assert.equal(result.droppedEvents, 0);
  assert.ok(result.averageThroughputEps > 1000, 'Throughput exceeds baseline SLA');
  assert.ok(result.p95Ms < 100, 'P95 latency is within SLA threshold');
  assert.equal(result.passedSla, true);
});
