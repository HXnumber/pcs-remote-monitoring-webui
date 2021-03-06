// Copyright (c) Microsoft. All rights reserved.

import { connect } from 'react-redux';
import { translate } from 'react-i18next';
import { Devices } from './devices';
import {
  epics as devicesEpics,
  getDevices,
  getEntities,
  getDevicesError,
  getDevicesLastUpdated,
  getDevicesPendingStatus
} from 'store/reducers/devicesReducer';
import { getDeviceGroups } from 'store/reducers/appReducer';

// Pass the devices status
const mapStateToProps = state => ({
  devices: getDevices(state),
  entities: getEntities(state),
  error: getDevicesError(state),
  isPending: getDevicesPendingStatus(state),
  deviceGroups: getDeviceGroups(state),
  lastUpdated: getDevicesLastUpdated(state)
});

// Wrap the dispatch method
const mapDispatchToProps = dispatch => ({
  fetchDevices: () => dispatch(devicesEpics.actions.fetchDevices())
});

export const DevicesContainer = translate()(connect(mapStateToProps, mapDispatchToProps)(Devices));
