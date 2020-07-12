# stats-counter
Middleware for express for counting visits on websites

## Usage
```
app.use(
  statsCounter(
    {
      visitTime: 10,
      apiPath: '/stats'
    }
  )
);
```

### Options
`visitTime` - required - Visit expiration after last request

`apiPath` - optional - Path for getting stats

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
