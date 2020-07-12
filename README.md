# stats-counter
Express middleware for counting visits on websites

## Usage
```
app.use(
  statsCounter(
    {
      visitTime: 10,
      apiPath: '/stats',
      savePath: 'statsSave',
      saveInterval: 60
    }
  )
);
```

### Options
`visitTime` - required - Visit expiration after last request

`apiPath` - optional - Path for getting stats

`savePath` - optional - File for saving stats, stats won't be saved if no path provided

`saveInterval` - optional (defaults to 60) - Interval in seconds

## API
HTTP request to `apiPath` returns stats in following format:

```
{
  total: {
    total: <total visit count>
    unique: <unique visit count>
  },
  thisMinute: {...},
  thisHour: {...},
  today: {...},
  thisMonth: {...},
  thisYear: {...}
}
```
