import { StratumSnapshot, StratumService } from '../src';
import { PRODUCT_NAME, PRODUCT_VERSION } from './utils/constants';
import { enableDebugMode, mockSessionId, restoreStratumMocks } from './utils/helpers';
import type { CatalogEvent } from '../src/types';
import { BASE_CATALOG } from './utils/catalog';
import { BASE_EVENT_MOCK } from './utils/fixtures';

describe('load stratum without plugins', () => {
  let stratum: StratumService;

  beforeEach(() => {
    enableDebugMode(true);
    mockSessionId();
    stratum = new StratumService({
      productName: PRODUCT_NAME,
      productVersion: PRODUCT_VERSION
    });
  });

  afterEach(() => {
    restoreStratumMocks();
    jest.restoreAllMocks();
  });

  describe('add base events', () => {
    it('should allow adding catalogs containing base events', async () => {
      const id = stratum.addCatalog({ items: BASE_CATALOG });
      expect(id).toBeDefined();
      const catalog = stratum.catalogs[id];
      expect(catalog).toBeDefined();
      expect(catalog.isValid).toBe(true);
      expect(Object.keys(catalog.validModels)).toStrictEqual(['1', '2']);
    });
  });

  describe('allow publishing base events', () => {
    let id = '';

    beforeEach(() => {
      id = stratum.addCatalog({ items: BASE_CATALOG });
    });

    it('should allow publishing  events', async () => {
      const listener = jest.fn();

      const event = await new Promise<StratumSnapshot>((resolve) => {
        listener.mockImplementation((event) => resolve(event));
        stratum.addSnapshotListener(listener);
        stratum.publishFromCatalog(id, 1);
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(event).toEqual(BASE_EVENT_MOCK);
    });

    it('should support eventData with type safety', async () => {
      // Define a catalog with eventDataType for typing only
      interface EventWithData extends CatalogEvent<'base', { userId: string; timestamp: number }> {
        eventDataType: { userId: string; timestamp: number }; // for typing only
      }

      const catalogWithData = {
        99: {
          eventType: 'base',
          description: 'Event with data',
          id: 99
        } as EventWithData
      };

      // Remove all catalogs to avoid collisions

      // Use a new StratumService instance for this test to avoid catalog collisions
      const testStratum = new StratumService({
        productName: PRODUCT_NAME,
        productVersion: PRODUCT_VERSION
      });

      const catalogId = testStratum.addCatalog({
        items: catalogWithData as unknown as import('../src/types').StratumCatalog<CatalogEvent>
      });
      testStratum.defaultCatalog = testStratum.catalogs[catalogId];

      // This should work - providing the required eventData
      const listener = jest.fn();
      await new Promise<void>((resolve) => {
        listener.mockImplementation(() => resolve());
        testStratum.addSnapshotListener(listener);
        testStratum.publish(99, {
          eventData: { userId: 'user123', timestamp: Date.now() }
        });
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
