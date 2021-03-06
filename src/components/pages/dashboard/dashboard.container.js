// Copyright (c) Microsoft. All rights reserved.

import { connect } from 'react-redux';
import { translate } from 'react-i18next';
import {
  getAzureMapsKey,
  getAzureMapsKeyError,
  getAzureMapsKeyPendingStatus,
  getDeviceGroupError
} from 'store/reducers/appReducer';
import { epics as rulesEpics } from 'store/reducers/rulesReducer';
import {
  getEntities as getRuleEntities,
  getRulesPendingStatus,
  getRulesError
} from 'store/reducers/rulesReducer';
import {
  getDevicesError,
  getDevicesLastUpdated,
  getDevicesPendingStatus,
  getEntities as getDeviceEntities
} from 'store/reducers/devicesReducer';

import { Dashboard } from './dashboard';

const mapStateToProps = state => ({
  azureMapsKey: getAzureMapsKey(state),
  azureMapsKeyError: getAzureMapsKeyError(state),
  azureMapsKeyIsPending: getAzureMapsKeyPendingStatus(state),
  devices: getDeviceEntities(state),
  devicesError: getDevicesError(state),
  devicesIsPending: getDevicesPendingStatus(state),
  deviceGroupError: getDeviceGroupError(state),
  rules: getRuleEntities(state),
  rulesError: getRulesError(state),
  rulesIsPending: getRulesPendingStatus(state),
  deviceLastUpdated: getDevicesLastUpdated(state)
});

// Wrap the dispatch method
const mapDispatchToProps = dispatch => ({
  fetchRules: () => dispatch(rulesEpics.actions.fetchRules())
});

export const DashboardContainer = translate()(connect(mapStateToProps, mapDispatchToProps)(Dashboard));
