import { BigQueryClient } from '../../src/core/BigQueryClient';
import { Transaction } from '../../src/core/Transaction';
import { mockBigQuery } from '../helpers/mockBigQuery';

jest.mock('@google-cloud/bigquery', () => require('../helpers/mockBigQuery').sdkModule);

const SECRET_PARAM = 'secret-param-value';
const SECRET_ROW = 'secret-row-value';

describe('console output', () => {
    let spies: jest.SpyInstance[];
    const output = () => spies.flatMap(s => s.mock.calls).map(args => args.map(String).join(' ')).join('\n');

    beforeEach(() => {
        mockBigQuery.reset();
        spies = (['log', 'error', 'warn', 'info', 'debug'] as const).map(m =>
            jest.spyOn(console, m).mockImplementation(() => undefined)
        );
    });

    afterEach(() => jest.restoreAllMocks());

    const make = (enableLogging: boolean) =>
        new BigQueryClient({ projectId: 'p', datasetId: 'd', enableLogging });

    it('select/delete/update/insert print nothing when logging is disabled', async () => {
        const client = make(false);
        mockBigQuery.queueQueryResult([{ name: SECRET_ROW }]);
        await client.select({ table: 'users', columns: ['name'], where: { name: SECRET_PARAM } });
        await client.delete({ table: 'users', where: { id: 1 } });
        await client.update({ table: 'users', set: { name: 'x' }, where: { id: 1 } });
        mockBigQuery.queueQueryError(new Error('boom'));
        await client.insert({ table: 'users', rows: [{ id: 1 }] });

        expect(spies.flatMap(s => s.mock.calls)).toEqual([]);
    });

    it('a failing Transaction prints nothing when logging is disabled', async () => {
        const client = make(false);
        const tx = new Transaction(client);
        tx.addQuery('SELECT 1');
        mockBigQuery.queueQueryError(new Error('boom'));

        await expect(tx.excute()).rejects.toThrow('boom');
        expect(spies.flatMap(s => s.mock.calls)).toEqual([]);
    });

    it('with logging enabled, select never prints params or result rows', async () => {
        const client = make(true);
        mockBigQuery.queueQueryResult([{ name: SECRET_ROW }]);
        await client.select({ table: 'users', columns: ['name'], where: { name: SECRET_PARAM } });

        expect(output()).toContain('SELECT');
        expect(output()).not.toContain(SECRET_PARAM);
        expect(output()).not.toContain(SECRET_ROW);
    });

    it('with logging enabled, a failed query is logged through the Logger', async () => {
        const client = make(true);
        const tx = new Transaction(client);
        tx.addQuery('SELECT 1');
        mockBigQuery.queueQueryError(new Error('boom'));

        await expect(tx.excute()).rejects.toThrow('boom');
        expect(output()).toContain('boom');
    });
});
