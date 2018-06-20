from atsd_client import connect, connect_url
from atsd_client.models import SeriesFilter, EntityFilter, DateFilter, SeriesQuery, Sample
from atsd_client.services import SeriesService

'''
Load data for one year and insert it with multiple year shift.
'''

# Connect to ATSD server
connection = connect_url('https://atsd_hostname:8443', 'user', 'password')

# Initialize services
svc = SeriesService(connection)

# specify years to increase
year_count = 5
# specify metric and entity names
metric_name = 'sml.power-consumed'
entity_name = '*'
# specify date filter
start_date = '2018-01-01T00:00:00Z'
end_date = '2019-01-01T00:00:01Z'

# prepare series_query and execute it
sf = SeriesFilter(metric=metric_name)
ef = EntityFilter(entity=entity_name)
df = DateFilter(start_date=start_date, end_date=end_date)
query = SeriesQuery(series_filter=sf, entity_filter=ef, date_filter=df)
series_list = svc.query(query)

for series in series_list:
  # update  timestamps
  updated_data = []
  for sample in series.data:
    current_date = sample.get_date()
    for i in range(1, year_count + 1):
      try:
        # increment year
        new_date = current_date.replace(year=current_date.year + i)
        updated_data.append(Sample(value=sample.v, time=new_date, version=sample.version))
      except ValueError:
        # Uncomment to add nonexistent dates to output
        print('%s, year shift is %s' % (current_date, i))
        continue
  series.data = updated_data
  series.aggregate = None
  svc.insert(series)
