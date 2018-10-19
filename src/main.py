#!/usr/bin/python2.5

# Copyright (C) 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
"""


import BaseHTTPServer, sys, urlparse
import bisect
import mimetypes
import os.path
import re
import signal
import json as simplejson
import socket
import time
import transitfeed
from transitfeed import util
import urllib
from datetime import datetime

# By default Windows kills Python with Ctrl+Break. Instead make Ctrl+Break
# raise a KeyboardInterrupt.
if hasattr(signal, 'SIGBREAK'):
  signal.signal(signal.SIGBREAK, signal.default_int_handler)


mimetypes.add_type('text/plain', '.vbs')


class ResultEncoder(simplejson.JSONEncoder):
  def default(self, obj):
    try:
      iterable = iter(obj)
    except TypeError:
      pass
    else:
      return list(iterable)
    return simplejson.JSONEncoder.default(self, obj)

# Code taken from
# http://aspn.activestate.com/ASPN/Cookbook/Python/Recipe/425210/index_txt
# An alternate approach is shown at
# http://mail.python.org/pipermail/python-list/2003-July/212751.html
# but it requires multiple threads. A sqlite object can only be used from one
# thread.
class StoppableHTTPServer(BaseHTTPServer.HTTPServer):
  def server_bind(self):
    BaseHTTPServer.HTTPServer.server_bind(self)
    self.socket.settimeout(1)
    self._run = True

  def get_request(self):
    while self._run:
      try:
        sock, addr = self.socket.accept()
        sock.settimeout(None)
        return (sock, addr)
      except socket.timeout:
        pass

  def stop(self):
    self._run = False

  def serve(self):
    while self._run:
      self.handle_request()


def StopToTuple(stop):
  """Return tuple as expected by javascript function addStopMarkerFromList"""
  return (stop.stop_id, stop.stop_name, float(stop.stop_lat),
          float(stop.stop_lon), stop.location_type)


class ScheduleRequestHandler(BaseHTTPServer.BaseHTTPRequestHandler):
  def do_GET(self):
    scheme, host, path, x, params, fragment = urlparse.urlparse(self.path)
    parsed_params = {}
    for k in params.split('&'):
      k = urllib.unquote(k)
      if '=' in k:
        k, v = k.split('=', 1)
        parsed_params[k] = unicode(v, 'utf8')
      else:
        parsed_params[k] = ''

    if path == '/':
      return self.handle_GET_home()

    m = re.match(r'/json/([a-z]{1,64})', path)
    if m:
      handler_name = 'handle_json_GET_%s' % m.group(1)
      handler = getattr(self, handler_name, None)
      if callable(handler):
        return self.handle_json_wrapper_GET(handler, parsed_params)

    # Restrict allowable file names to prevent relative path attacks etc
    m = re.match(r'/file/([a-z0-9_-]{1,64}\.?[a-z0-9_-]{1,64})$', path)
    if m and m.group(1):
      try:
        f, mime_type = self.OpenFile(m.group(1))
        return self.handle_static_file_GET(f, mime_type)
      except IOError, e:
        print "Error: unable to open %s" % m.group(1)
        # Ignore and treat as 404

    m = re.match(r'/([a-z]{1,64})', path)
    if m:
      handler_name = 'handle_GET_%s' % m.group(1)
      handler = getattr(self, handler_name, None)
      if callable(handler):
        return handler(parsed_params)

    return self.handle_GET_default(parsed_params, path)

  def OpenFile(self, filename):
    """Try to open filename in the static files directory of this server.
    Return a tuple (file object, string mime_type) or raise an exception."""
    (mime_type, encoding) = mimetypes.guess_type(filename)
    assert mime_type
    # A crude guess of when we should use binary mode. Without it non-unix
    # platforms may corrupt binary files.
    if mime_type.startswith('text/'):
      mode = 'r'
    else:
      mode = 'rb'
    return open(os.path.join(self.server.file_dir, filename), mode), mime_type

  def handle_GET_default(self, parsed_params, path):
    self.send_error(404)

  def handle_static_file_GET(self, fh, mime_type):
    content = fh.read()
    self.send_response(200)
    self.send_header('Content-Type', mime_type)
    self.send_header('Content-Length', str(len(content)))
    self.end_headers()
    self.wfile.write(content)

  def handle_GET_home(self):
    schedule = self.server.schedule
    (min_lat, min_lon, max_lat, max_lon) = schedule.GetStopBoundingBox()

    key = self.server.key
    host = self.server.host

    # A very simple template system. For a fixed set of values replace $XXX
    # with the value of local variable XXX
    f, _ = self.OpenFile('index.html')
    content = f.read()
    for v in ('min_lat', 'min_lon', 'max_lat', 'max_lon', 'key', 'host'):
      content = content.replace('$%s' % v, str(locals()[v]))

    self.send_response(200)
    self.send_header('Content-Type', 'text/html')
    self.send_header('Content-Length', str(len(content)))
    self.end_headers()
    self.wfile.write(content)

  def handle_json_wrapper_GET(self, handler, parsed_params):
    """Call handler and output the return value in JSON."""
    schedule = self.server.schedule
    result = handler(parsed_params)
    content = ResultEncoder().encode(result)
    self.send_response(200)
    self.send_header('Content-Type', 'text/plain')
    self.send_header('Content-Length', str(len(content)))
    self.end_headers()
    self.wfile.write(content)

  def handle_json_GET_state(self, params):
    routes = self.all_routes()
    now = datetime.now()
    date = now.strftime("%Y%m%d")
    secs = now.hour * 3600 + now.minute * 60 + now.second
    trips = [self.active_trips(r[0], date, secs) for r in routes]
    # import code; code.interact(local=dict(globals(), **locals()))
    return [t.trip.GetTimeStops()[1][0] for t in trips]

  def active_trips(self, route, date, time):
    """Given a route_id generate a list of patterns of the route. For each
    pattern include some basic information and a few sample trips."""
    schedule = self.server.schedule
    route = schedule.GetRoute(route)
    if not route:
      self.send_error(404)
      return

    pattern_id_trip_dict = route.GetPatternIdTripDict()

    active_trips = []
    for _, trips in pattern_id_trip_dict.items():
      time_stops = trips[0].GetTimeStops()
      if not time_stops:
        continue

      # Iterating over a copy so we can remove from trips inside the loop
      trips_with_service = []
      for trip in trips:
        service_id = trip.service_id
        service_period = schedule.GetServicePeriod(service_id)

        if date and not service_period.IsActiveOn(date):
          continue
        trips_with_service.append(trip)

      trips = trips_with_service
      transitfeed.SortListOfTripByTime(trips)

      active_trips.append([t for t in trips if t.GetStartTime() <= time <= t.GetEndTime()])

    return active_trips

  def all_routes(self):
    schedule = self.server.schedule
    result = []
    for r in schedule.GetRouteList():
      result.append((r.route_id, r.route_short_name, r.route_long_name))
    result.sort(key = lambda x: x[1:3])
    return result

  def trip_rows(self, trip_id):
    """Return a list of rows from the feed file that are related to this
    trip."""
    schedule = self.server.schedule
    try:
      trip = schedule.GetTrip(trip_id)
    except KeyError:
      # if a non-existent trip is searched for, the return nothing
      return
    route = schedule.GetRoute(trip.route_id)
    return [trip, route]

  def trip_stop_times(self, trip_id):
    schedule = self.server.schedule
    try:
      trip = schedule.GetTrip(trip_id)
    except KeyError:
       # if a non-existent trip is searched for, the return nothing
      return
    return trip.GetTimeStops()

  def trip_shape(self, trip_id):
    schedule = self.server.schedule
    try:
      trip = schedule.GetTrip(trip_id)
    except KeyError:
       # if a non-existent trip is searched for, the return nothing
      return
    points = []
    if trip.shape_id:
      shape = schedule.GetShape(trip.shape_id)
      for (lat, lon, dist) in shape.points:
        points.append((lat, lon))
    else:
      time_stops = trip.GetTimeStops()
      for arr,dep,stop in time_stops:
        points.append((stop.stop_lat, stop.stop_lon))
    route = schedule.GetRoute(trip.route_id)
    polyline_data = {'points': points}
    if route.route_color:
      polyline_data['color'] = '#' + route.route_color
    return polyline_data

  def stops_in_boundinbox(self, n, e, s, w, limit):
    """Return a list of up to 'limit' stops within bounding box with 'n','e'
    and 's','w' in the NE and SW corners. Does not handle boxes crossing
    longitude line 180."""
    schedule = self.server.schedule
    stops = schedule.GetStopsInBoundingBox(north=n, east=e, south=s, west=w, n=limit)
    return [StopToTuple(s) for s in stops]

def FindPy2ExeBase():
  """If this is running in py2exe return the install directory else return
  None"""
  # py2exe puts gtfsscheduleviewer in library.zip. For py2exe setup.py is
  # configured to put the data next to library.zip.
  windows_ending = __file__.find('\\library.zip\\')
  if windows_ending != -1:
    return transitfeed.__file__[:windows_ending]
  else:
    return None


def FindDefaultFileDir():
  """Return the path of the directory containing the static files. By default
  the directory is called 'files'. The location depends on where setup.py put
  it."""
  base = FindPy2ExeBase()
  if base:
    return os.path.join(base, 'schedule_viewer_files')
  else:
    # For all other distributions 'files' is in the gtfsscheduleviewer
    # directory.
    base = os.path.dirname(__file__)  # Strip __init__.py
    return os.path.join(base, 'static')


def GetDefaultKeyFilePath():
  """In py2exe return absolute path of file in the base directory and in all
  other distributions return relative path 'key.txt'"""
  windows_base = FindPy2ExeBase()
  if windows_base:
    return os.path.join(windows_base, 'key.txt')
  else:
    return 'key.txt'


def main(RequestHandlerClass = ScheduleRequestHandler):
  usage = \
'''%prog [options] [<input GTFS.zip>]

Runs a webserver that lets you explore a <input GTFS.zip> in your browser.

If <input GTFS.zip> is omited the filename is read from the console. Dragging
a file into the console may enter the filename.

For more information see
https://github.com/google/transitfeed/wiki/ScheduleViewer
'''
  parser = util.OptionParserLongError(
      usage=usage, version='%prog '+transitfeed.__version__)
  parser.add_option('--feed_filename', '--feed', dest='feed_filename',
                    help='file name of feed to load')
  parser.add_option('--key', dest='key',
                    help='Google Maps API key or the name '
                    'of a text file that contains an API key')
  parser.add_option('--host', dest='host', help='Host name of Google Maps')
  parser.add_option('--port', dest='port', type='int',
                    help='port on which to listen')
  parser.add_option('--file_dir', dest='file_dir',
                    help='directory containing static files')
  parser.add_option('-n', '--noprompt', action='store_false',
                    dest='manual_entry',
                    help='disable interactive prompts')
  parser.set_defaults(port=8765,
                      host='maps.google.com',
                      file_dir=FindDefaultFileDir(),
                      manual_entry=True)
  (options, args) = parser.parse_args()

  if not os.path.isfile(os.path.join(options.file_dir, 'index.html')):
    print "Can't find index.html with --file_dir=%s" % options.file_dir
    exit(1)

  if not options.feed_filename and len(args) == 1:
    options.feed_filename = args[0]

  if not options.feed_filename and options.manual_entry:
    options.feed_filename = raw_input('Enter Feed Location: ').strip('"')

  default_key_file = GetDefaultKeyFilePath()
  if not options.key and os.path.isfile(default_key_file):
    options.key = open(default_key_file).read().strip()

  if options.key and os.path.isfile(options.key):
    options.key = open(options.key).read().strip()

  # This key is registered to gtfs.schedule.viewer@gmail.com
  if not options.key:
    options.key = 'AIzaSyAZTTRO6RC6LQyKCD3JODhxbClsZl95P9U'

  util.CheckVersion(transitfeed.ProblemReporter())

  migrate = False
  schedule = transitfeed.Schedule(
    problem_reporter=transitfeed.ProblemReporter(),
    db_filename="bhtrans.sql",
    migrate=migrate
  )
  if migrate == True: 
    print 'Loading data from feed "%s"...' % options.feed_filename
    print '(this may take a few minutes for larger cities)'
    schedule.Load(options.feed_filename)

  server = StoppableHTTPServer(server_address=('', options.port),
                               RequestHandlerClass=RequestHandlerClass)
  server.key = options.key
  server.schedule = schedule
  server.file_dir = options.file_dir
  server.host = options.host
  server.feed_path = options.feed_filename

  print ("To view, point your browser at http://localhost:%d/" %
         (server.server_port))
  server.serve_forever()


if __name__ == '__main__':
  main()
