// Copyright (c) Microsoft. All rights reserved.

import React from 'react';

import {
  Btn,
  BtnToolbar,
  FormControl,
  FormGroup,
  FormLabel,
  Radio,
  ToggleBtn,
  SectionDesc,
  SummaryCount,
  SummarySection,
  AjaxError
} from 'components/shared';
import { SeverityRenderer } from 'components/shared/cellRenderers';
import {
  Validator,
  svgs,
  LinkedComponent
} from 'utilities';
import Flyout from 'components/shared/flyout';
import { IoTHubManagerService, TelemetryService } from 'services';
import { toNewRuleRequestModel } from 'services/models';

import './ruleEditor.css';

const Section = Flyout.Section;
const severityLevels = ['critical', 'warning', 'info'];
const calculations = ['average', 'instant'];
const operatorOptions = [
  { label: '>', value: 'GreaterThan' },
  { label: '>=', value: 'GreaterThanOrEqual' },
  { label: '<', value: 'LessThan' },
  { label: '<=', value: 'LessThanOrEqual' },
  { label: '=', value: 'Equals' }
];
// A counter for creating unique keys per new condition
let conditionKey = 0;

// Creates a state object for a condition
const newCondition = () => ({
  field: '',
  calculation: '',
  duration: '00:00:00',
  operator: operatorOptions[0].value,
  value: '',
  key: conditionKey++ // Used by react to track the rendered elements
});

// A state object for a new rule
const newRule = {
  name: '',
  description: '',
  groupId: '',
  conditions: [newCondition()], // Start with one condition
  severity: severityLevels[0],
  enabled: true
}

export class RuleEditor extends LinkedComponent {

  constructor(props) {
    super(props);
    const { rule } = props;
    const formData = rule ? rule : newRule;
    this.state = {
      isPending: false,
      error: undefined,
      fieldOptions: [],
      devicesAffected: 0,
      formData
    };
  }

  componentDidMount() {
    if (this.props.rule) this.getDeviceCountAndFields(this.props.rule.groupId);
  }

  componentWillUnmount() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  toSelectOption = ({ id, displayName }) => ({ label: displayName, value: id });

  addCondition = () => this.conditionsLink.set([...this.conditionsLink.value, newCondition()]);

  deleteCondition = (index) =>
    (evt) => this.conditionsLink.set(this.conditionsLink.value.filter((_, idx) => index !== idx));

  formIsValid() {
    return [
      this.ruleNameLink,
      this.deviceGroupLink,
      this.conditionsLink,
    ].every(link => !link.error);
  }

  apply = (event) => {
    event.preventDefault();
    const { formData } = this.state;
    const { onClose, insertRule, updateRule } = this.props;
    console.log('TODO: Handle the form submission');
    if (this.formIsValid()) {
      this.setState({ isPending: true });
      if (this.subscription) this.subscription.unsubscribe();
      if (this.props.rule) { // If rule object exist then update the existing rule
        this.subscription = TelemetryService.updateRule(this.props.rule.id, toNewRuleRequestModel(formData))
          .subscribe(
            (updatedRule) => {
              updateRule(updatedRule);
              this.setState({ isPending: false });
              onClose();
            },
            error => this.setState({ error, isPending: false })
          );
      } else { // If rule object doesn't exist then create a new rule
        this.subscription = TelemetryService.createRule(toNewRuleRequestModel(formData))
          .subscribe(
            (createdRule) => {
              insertRule(createdRule);
              this.setState({ isPending: false });
              onClose();
            },
            error => this.setState({ error, isPending: false })
          );
      }
    }
  }

  onGroupIdChange = ({ target: { value: { value = {} } } }) => {
    this.getDeviceCountAndFields(value);
  }

  getDeviceCountAndFields(groupId) {
    this.props.deviceGroups.some(group => {
      if (group.id === groupId) {
        if (this.subscription) this.subscription.unsubscribe();
        this.subscription = IoTHubManagerService.getDevices(group.conditions)
          .subscribe(
            groupDevices => {
              this.setState({
                fieldOptions: this.getConditionFields(groupDevices),
                devicesAffected: groupDevices.length
              });
            },
            error => this.setState({ error })
          );
        return true;
      }
      return false;
    });
  }

  getConditionFields(devices) {
    const conditions = new Set(); // Using a set to avoid searching the array multiple times in the every
    devices.forEach(({ telemetry = {} }) => {
      Object.values(telemetry).forEach(({ messageSchema: { fields } }) => {
        Object.keys(fields).forEach((field) => {
          if (field.indexOf('_unit') === -1) conditions.add(field);
        })
      })
    })
    return [...conditions.values()].map(field => ({ label: field, value: field }));
  }

  //todo toggle button didn't support link
  onToggle = ({ target: { value } }) => {
    this.setState({ formData: { ...this.state.formData, enabled: value } })
  }

  render() {
    const { onClose, t, deviceGroups = [] } = this.props;
    const { error, formData, fieldOptions, devicesAffected } = this.state;
    const calculationOptions = calculations.map(value => ({
      label: t(`rules.flyouts.ruleEditor.calculation.${value}`),
      value
    }));
    const deviceGroupOptions = deviceGroups.map(this.toSelectOption);
    // Validators
    const requiredValidator = (new Validator()).check(Validator.notEmpty, t('rules.flyouts.ruleEditor.validation.required'));
    // State links
    this.formDataLink = this.linkTo('formData');
    this.ruleNameLink = this.formDataLink.forkTo('name').withValidator(requiredValidator);
    this.descriptionLink = this.formDataLink.forkTo('description');
    this.deviceGroupLink = this.formDataLink.forkTo('groupId')
      .map(({ value }) => value)
      .withValidator(requiredValidator);
    this.conditionsLink = this.formDataLink.forkTo('conditions').withValidator(requiredValidator);
    this.severityLink = this.formDataLink.forkTo('severity');
    //todo toggle button didn't support link
    this.enabledLink = this.formDataLink.forkTo('enabled');
    // Create the state link for the dynamic form elements
    const conditionLinks = this.conditionsLink.getLinkedChildren(conditionLink => {
      const fieldLink = conditionLink.forkTo('field').map(({ value }) => value).withValidator(requiredValidator);
      const calculationLink = conditionLink.forkTo('calculation').map(({ value }) => value).withValidator(requiredValidator);
      const operatorLink = conditionLink.forkTo('operator').withValidator(requiredValidator);;
      const valueLink = conditionLink.forkTo('value').withValidator(requiredValidator);;
      const durationLink = conditionLink.forkTo('duration');
      return { fieldLink, calculationLink, operatorLink, valueLink, durationLink };
    });

    return (
      <form onSubmit={this.apply} className='new-rule-flyout-container'>
        <Section.Container className='rule-property-container'>
          <Section.Content>
            <FormGroup>
              <FormLabel isRequired='true'>{t('rules.flyouts.ruleEditor.ruleName')}</FormLabel>
              <FormControl
                type='text'
                className='long'
                placeholder={t('rules.flyouts.ruleEditor.namePlaceholder')}
                link={this.ruleNameLink} />
            </FormGroup>
            <FormGroup>
              <FormLabel>{t('rules.flyouts.ruleEditor.description')}</FormLabel>
              <FormControl
                type='textarea'
                placeholder={t('rules.flyouts.ruleEditor.descriptionPlaceholder')}
                link={this.descriptionLink} />
            </FormGroup>
            <FormGroup>
              <FormLabel isRequired='true'>{t('rules.flyouts.ruleEditor.deviceGroup')}</FormLabel>
              <FormControl
                type='select'
                className='long'
                options={deviceGroupOptions}
                onChange={this.onGroupIdChange}
                clearable={false}
                searchable={true}
                placeholder={t('rules.flyouts.ruleEditor.deviceGroupPlaceholder')}
                link={this.deviceGroupLink} />
            </FormGroup>
          </Section.Content>
        </Section.Container>

        <Section.Container collapsable={false}>
          <Section.Header>{t('rules.flyouts.ruleEditor.conditions')}</Section.Header>
          <Section.Content>
            <Btn svg={svgs.plus} onClick={this.addCondition}>{t('rules.flyouts.ruleEditor.addCondition')}</Btn>
          </Section.Content>
        </Section.Container>
        {
          conditionLinks.map((condition, idx) => (
            <Section.Container key={formData.conditions[idx].key}>
              <Section.Header>{t('rules.flyouts.ruleEditor.condition.condition')} {idx + 1}</Section.Header>
              <Section.Content>
                <FormGroup>
                  <FormLabel isRequired='true'>{t('rules.flyouts.ruleEditor.condition.field')}</FormLabel>
                  <FormControl
                    type='select'
                    className='long'
                    placeholder={t('rules.flyouts.ruleEditor.condition.fieldPlaceholder')}
                    link={condition.fieldLink}
                    options={fieldOptions}
                    clearable={false}
                    searchable={true} />
                </FormGroup>
                <FormGroup>
                  <FormLabel isRequired='true'>{t('rules.flyouts.ruleEditor.condition.calculation')}</FormLabel>
                  <FormControl
                    type='select'
                    className='long'
                    placeholder={t('rules.flyouts.ruleEditor.condition.calculationPlaceholder')}
                    link={condition.calculationLink}
                    options={calculationOptions}
                    onChange={this.onCalculationChange}
                    clearable={false}
                    searchable={false} />
                </FormGroup>
                {
                  condition.calculationLink.value === calculations[0] &&
                  <FormGroup>
                    <FormLabel isRequired='true'>{t('rules.flyouts.ruleEditor.condition.timePeriod')}</FormLabel>
                    <FormControl
                      type='duration'
                      link={condition.durationLink} />
                  </FormGroup>
                }
                <FormGroup>
                  <FormLabel isRequired='true'>{t('rules.flyouts.ruleEditor.condition.operator')}</FormLabel>
                  <FormControl
                    type='select'
                    className='short'
                    placeholder={t('rules.flyouts.ruleEditor.condition.operatorPlaceholder')}
                    link={condition.operatorLink}
                    options={operatorOptions}
                    clearable={false}
                    searchable={false} />
                </FormGroup>
                <FormGroup>
                  <FormLabel isRequired='true'>{t('rules.flyouts.ruleEditor.condition.value')}</FormLabel>
                  <FormControl
                    type='text'
                    placeholder={t('rules.flyouts.ruleEditor.condition.valuePlaceholder')}
                    link={condition.valueLink} />
                </FormGroup>
                {
                  conditionLinks.length > 1 &&
                  <Btn className='padded-top' svg={svgs.trash} onClick={this.deleteCondition(idx)}>{t('rules.flyouts.ruleEditor.delete')}</Btn>
                }
              </Section.Content>
            </Section.Container>
          ))
        }
        <Section.Container collapsable={false}>
          <Section.Content>
            <FormGroup className='padded-top'>
              <FormLabel>{t('rules.flyouts.ruleEditor.severityLevel')}</FormLabel>
              <Radio
                link={this.severityLink}
                value={severityLevels[0]}>
                <SeverityRenderer value={severityLevels[0]} context={{ t }} />
              </Radio>
              <Radio
                link={this.severityLink}
                value={severityLevels[1]}>
                <SeverityRenderer value={severityLevels[1]} context={{ t }} />
              </Radio>
              <Radio
                link={this.severityLink}
                value={severityLevels[2]}>
                <SeverityRenderer value={severityLevels[2]} context={{ t }} />
              </Radio>
            </FormGroup>
          </Section.Content>
          <Section.Content>
            <FormGroup>
              <FormLabel>{t('rules.flyouts.ruleEditor.ruleStatus')}</FormLabel>
              <ToggleBtn
                value={formData.enabled}
                onChange={this.onToggle} >
                {formData.enabled ? t('rules.flyouts.ruleEditor.ruleEnabled') : t('rules.flyouts.ruleEditor.ruleDisabled')}
              </ToggleBtn>
            </FormGroup>
          </Section.Content>
        </Section.Container>
        <SummarySection>
          <SummaryCount>{devicesAffected}</SummaryCount>
          <SectionDesc>{t('rules.flyouts.ruleEditor.devicesAffected')}</SectionDesc>
        </SummarySection>
        {
          error && <AjaxError t={t} error={error} />
        }
        <BtnToolbar>
          <Btn primary={true} type="submit" disabled={this.isPending || !this.formIsValid()}>{t('rules.flyouts.ruleEditor.apply')}</Btn>
          <Btn svg={svgs.cancelX} onClick={onClose}>{t('rules.flyouts.ruleEditor.cancel')}</Btn>
        </BtnToolbar>
      </form>
    );
  }
}
