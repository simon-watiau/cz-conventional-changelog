"format cjs";

var engine = require('./engine');
var conventionalCommitTypes = require('conventional-commit-types');
var types = conventionalCommitTypes.types;

types['temp'] = {
  'description': 'An intermediate commit to be squashed',
  'title': 'intermediate commit'
};

module.exports = engine({
  types: types,
  defaultType: process.env.CZ_TYPE,
  defaultScope: process.env.CZ_SCOPE,
  defaultSubject: process.env.CZ_SUBJECT,
  defaultBody: process.env.CZ_BODY,
  defaultIssues: process.env.CZ_ISSUES
});
