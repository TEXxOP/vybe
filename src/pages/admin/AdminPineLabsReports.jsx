import { useMemo, useState } from 'react';

import Button from '../../components/primitives/Button';
import { Icons } from '../../components/Icons';
import { adminAPI } from '../../services/api';
import table from './AdminTable.module.css';
import styles from './AdminPineLabsReports.module.css';

const SENSITIVE_KEY = /(?:secret|password|authorization|token|cvv|\bpin\b|card.?number|\bpan\b|track.?data)/i;

const PREFERRED_COLUMNS = [
    'transactionId',
    'transaction_id',
    'transactionReference',
    'transaction_reference',
    'invoiceNumber',
    'invoice_number',
    'status',
    'amount',
    'paymentMode',
    'payment_mode',
    'transactionDate',
    'transaction_date',
    'settlementDate',
    'settlement_date',
];

function datetimeInputValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

function initialRange() {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    return { fromDate: datetimeInputValue(from), toDate: datetimeInputValue(to) };
}

function reportRows(report) {
    if (Array.isArray(report)) return report;
    if (!report || typeof report !== 'object') return [];

    const likelyCollections = ['transactions', 'content', 'data', 'items', 'results', 'records'];
    for (const key of likelyCollections) {
        if (Array.isArray(report[key])) return report[key];
    }

    const nestedArray = Object.values(report).find((value) => Array.isArray(value));
    if (nestedArray) return nestedArray;

    return [report];
}

function reportColumns(rows) {
    const available = new Set();
    rows.slice(0, 25).forEach((row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return;
        Object.keys(row).forEach((key) => {
            if (!SENSITIVE_KEY.test(key)) available.add(key);
        });
    });

    const preferred = PREFERRED_COLUMNS.filter((key) => available.has(key));
    const remaining = [...available]
        .filter((key) => !preferred.includes(key))
        .sort((a, b) => a.localeCompare(b));

    return [...preferred, ...remaining].slice(0, 10);
}

function displayValue(value) {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'number') return new Intl.NumberFormat('en-IN').format(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

function labelForColumn(key) {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/^./, (letter) => letter.toUpperCase());
}

function reportedTotal(report) {
    const candidates = [
        report?.totalElements,
        report?.total,
        report?.totalCount,
        report?.pagination?.total,
        report?.page?.totalElements,
    ];
    return candidates.find((value) => Number.isFinite(Number(value)));
}

export default function AdminPineLabsReports() {
    const [filters, setFilters] = useState(initialRange);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(100);
    const [state, setState] = useState({ status: 'idle', result: null, error: '' });

    const rows = useMemo(() => reportRows(state.result?.report), [state.result]);
    const columns = useMemo(() => reportColumns(rows), [rows]);
    const total = reportedTotal(state.result?.report);
    const activePage = Number(state.result?.query?.page ?? page);
    const activeSize = Number(state.result?.query?.size ?? size);
    const hasNext = Number.isFinite(Number(total))
        ? (activePage + 1) * activeSize < Number(total)
        : rows.length === activeSize;

    const load = async (nextPage = page) => {
        const from = new Date(filters.fromDate);
        const to = new Date(filters.toDate);
        if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
            setState({
                status: 'error',
                result: null,
                error: 'Choose a valid date range with a start before the end.',
            });
            return;
        }

        setState((previous) => ({ ...previous, status: 'loading', error: '' }));
        try {
            const result = await adminAPI.getPineLabsTransactionSummary({
                fromDate: from.toISOString(),
                toDate: to.toISOString(),
                page: nextPage,
                size,
            });
            setPage(nextPage);
            setState({ status: 'ready', result, error: '' });
        } catch (error) {
            setState({
                status: 'error',
                result: null,
                error: error?.message || 'Could not retrieve the Pine Labs report.',
            });
        }
    };

    const submit = (event) => {
        event.preventDefault();
        load(0);
    };

    return (
        <section aria-labelledby="pine-labs-report-intro">
            <div className={styles.intro}>
                <div>
                    <p className={styles.kicker}>Pine One · terminal reconciliation</p>
                    <p id="pine-labs-report-intro" className={styles.copy}>
                        Retrieve transactions processed on Pine Labs POS terminals. This report is
                        private to administrators; it does not create customer payments or expose
                        Pine Labs credentials in the browser.
                    </p>
                </div>
            </div>

            <form className={styles.filters} onSubmit={submit}>
                <label className={styles.field}>
                    <span>From</span>
                    <input
                        type="datetime-local"
                        value={filters.fromDate}
                        onChange={(event) =>
                            setFilters((current) => ({ ...current, fromDate: event.target.value }))
                        }
                        required
                    />
                </label>

                <label className={styles.field}>
                    <span>To</span>
                    <input
                        type="datetime-local"
                        value={filters.toDate}
                        onChange={(event) =>
                            setFilters((current) => ({ ...current, toDate: event.target.value }))
                        }
                        required
                    />
                </label>

                <label className={styles.field}>
                    <span>Rows</span>
                    <select value={size} onChange={(event) => setSize(Number(event.target.value))}>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                        <option value={500}>500</option>
                    </select>
                </label>

                <Button type="submit" variant="riso" loading={state.status === 'loading'}>
                    <Icons.RefreshCw size={14} /> Fetch report
                </Button>
            </form>

            {state.status === 'idle' ? (
                <div className={table.empty}>
                    <p className={table.emptyTitle}>Choose a date range</p>
                    <p className={table.emptyText}>
                        Reports load only when requested, so opening this page never makes an
                        unnecessary request to Pine Labs.
                    </p>
                </div>
            ) : null}

            {state.status === 'error' ? (
                <div className={table.empty}>
                    <p className={table.emptyTitle}>Couldn’t load Pine Labs data</p>
                    <p className={table.emptyText} role="alert">
                        {state.error}
                    </p>
                    <div className={table.emptyActions}>
                        <Button variant="riso" size="md" onClick={() => load(page)}>
                            <Icons.RefreshCw size={14} /> Try again
                        </Button>
                    </div>
                </div>
            ) : null}

            {state.status === 'ready' && rows.length === 0 ? (
                <div className={table.empty}>
                    <p className={table.emptyTitle}>No terminal transactions found</p>
                    <p className={table.emptyText}>
                        Pine Labs returned a successful report with no transactions in this date
                        range. Try a wider period before treating this as a quiet sales day.
                    </p>
                </div>
            ) : null}

            {state.status === 'ready' && rows.length > 0 ? (
                <>
                    <div className={table.toolbar}>
                        <p className={table.count}>
                            {rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}
                            {Number.isFinite(Number(total)) ? ` of ${Number(total)}` : ''}
                        </p>
                        <div className={styles.pagination} aria-label="Report pages">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={activePage === 0 || state.status === 'loading'}
                                onClick={() => load(activePage - 1)}
                            >
                                Previous
                            </Button>
                            <span className={styles.page}>Page {activePage + 1}</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!hasNext || state.status === 'loading'}
                                onClick={() => load(activePage + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>

                    <div
                        className={table.scroller}
                        tabIndex={0}
                        role="region"
                        aria-label="Pine Labs terminal transactions, scrollable"
                    >
                        <table className={table.table}>
                            <caption>
                                Pine Labs POS transactions for the selected period. The available
                                columns follow the fields Pine Labs supplied in this report.
                            </caption>
                            <thead>
                                <tr>
                                    {columns.map((column) => (
                                        <th key={column} scope="col">
                                            {labelForColumn(column)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rowIndex) => (
                                    <tr key={row?.id || row?.transactionId || rowIndex}>
                                        {columns.map((column) => (
                                            <td key={column} className={styles.cell}>
                                                {displayValue(row?.[column])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </section>
    );
}
