const originalLogFunction = console.log;
let data: { time: Date, args: any[] }[];

const formatDate = (date: Date) => {
    const year = date.getFullYear().toString().padStart(4, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${milliseconds}`;
}

beforeEach('Suppress-Logs', function () {
    data = [];
    console.log = (...args: any) => {
        data.push({time: new Date(), args});
    };
});

afterEach('Suppress-Logs', function () {
    console.log = originalLogFunction;
    if (this.currentTest?.state !== 'passed' && data.length) {
        console.log('The following log was produced as part of the test:')
        data.forEach(data => console.log(`[${formatDate(data.time)}]`, ...data.args));
    }
});