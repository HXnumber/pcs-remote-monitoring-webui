// Copyright (c) Microsoft. All rights reserved.

import React from 'react';
import { RuleEditorContainer } from './ruleEditor';
import { LinkedComponent } from 'utilities';
import Flyout from 'components/shared/flyout';

export class NewRuleFlyout extends LinkedComponent {
  render() {
    const { t, onClose } = this.props;
    return (
      <Flyout.Container>
        <Flyout.Header>
          <Flyout.Title>{t('rules.flyouts.newRule')}</Flyout.Title>
          <Flyout.CloseBtn onClick={onClose} />
        </Flyout.Header>
        <Flyout.Content>
          <RuleEditorContainer onClose={onClose} />
        </Flyout.Content>
      </Flyout.Container>
    )
  }
}
