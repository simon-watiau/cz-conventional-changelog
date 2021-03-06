"format cjs";

var wrap = require('word-wrap');
var map = require('lodash.map');
var longest = require('longest');
var rightPad = require('right-pad');
var child_process = require('child_process');

var filter = function(array) {
  return array.filter(function(x) {
    return x;
  });
};

// This can be any kind of SystemJS compatible module.
// We use Commonjs here, but ES6 or AMD would do just
// fine.
module.exports = function (options) {

  var types = options.types;

  var length = longest(Object.keys(types)).length + 1;
  var choices = map(types, function (type, key) {
    return {
      name: rightPad(key + ':', length) + ' ' + type.description,
      value: key
    };
  });

  return {
    // When a user runs `git cz`, prompter will
    // be executed. We pass you cz, which currently
    // is just an instance of inquirer.js. Using
    // this you can ask questions and get answers.
    //
    // The commit callback should be executed when
    // you're ready to send back a commit template
    // to git.
    //
    // By default, we'll de-indent your commit
    // template and will keep empty lines.
    prompter: function(cz, commit) {
      var branch = (child_process.execSync('git rev-parse --abbrev-ref HEAD') + '').replace(/\n$/, '');
      var diff = (child_process.execSync('git diff --stat --name-only --staged') + '').replace(/\n$/, '');

      var maxLineWidth = 72;

      var computeHead = function(type, scope, subject) {
        scope = scope.trim();
        scope = scope ? '(' + scope + ')' : '';
        subject = subject.trim();

        return type + scope + ': ' + subject;
      };

      console.log("Branch: " + branch);
      console.log('-------------------------');
      console.log(diff);
      console.log('-------------------------\n');

      // Let's ask some questions of the user
      // so that we can populate our commit
      // template.
      //
      // See inquirer.js docs for specifics.
      // You can also opt to use another input
      // collection library if you prefer.
      cz.prompt([
        {
          type: 'list',
          name: 'type',
          message: 'Select the type of change that you\'re committing:',
          choices: choices,
          default: options.defaultType
        }, {
          type: 'input',
          name: 'scope',
          message: 'What is the scope of this change (e.g. component or file name)? (press enter to skip)\n',
          default: options.defaultScope
        }, {
          type: 'input',
          name: 'subject',
          message: 'Write a short, imperative tense description of the change:\n',
          default: options.defaultSubject,
          validate: function(input, answers) {
            var headLength = computeHead(answers.type, answers.scope, input).length;

            if (headLength > maxLineWidth) {
              return 'Line too long (' + headLength + ">" + maxLineWidth + ")";
            }

            return true;
          }
        }, {
          type: 'input',
          name: 'body',
          message: 'Provide a longer description of the change: (press enter to skip)\n',
          default: options.defaultBody
        }, {
          type: 'confirm',
          name: 'isBreaking',
          message: 'Are there any breaking changes?',
          default: false
        }, {
          type: 'input',
          name: 'breaking',
          message: 'Describe the breaking changes:\n',
          when: function(answers) {
            return answers.isBreaking;
          }
        }, {
          type: 'confirm',
          name: 'isIssueAffected',
          message: 'Does this change affect any open issues?',
          default: options.defaultIssues ? true : false
        }, {
          type: 'input',
          name: 'issues',
          message: 'Add issue references (' + branch + '):\n',
          when: function(answers) {
            return answers.isIssueAffected;
          },
          default: options.defaultIssues ? options.defaultIssues : undefined
        }
      ]).then(function(answers) {

        var wrapOptions = {
          trim: true,
          newline: '\n',
          indent:'',
          width: maxLineWidth
        };

        var head = computeHead(answers.type, answers.scope,  answers.subject);

        // Wrap these lines at 100 characters
        var body = wrap(answers.body, wrapOptions);

        // Apply breaking change prefix, removing it if already present
        var breaking = answers.breaking ? answers.breaking.trim() : '';
        breaking = breaking ? 'BREAKING CHANGE: ' + breaking.replace(/^BREAKING CHANGE: /, '') : '';
        breaking = wrap(breaking, wrapOptions);

        var issues = answers.issues ? wrap(answers.issues, wrapOptions) : '';

        var footer = filter([ breaking, issues ]).join('\n\n');

        commit(head + '\n\n' + body + '\n\nbranch: ' + branch + '\n\n' + footer);
      });
    }
  };
};
