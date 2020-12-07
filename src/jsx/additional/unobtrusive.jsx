/* ******************************************************************* *
 * jquery validation plugin supplement.
 * Licensed under MIT (http://www.opensource.org/licenses/MIT)
 * ******************************************************************* */

+function ($) {
    'use strict';

    var ValidationSupplement = function (element, options) {
        this.element = element;
        this.options = options;
        this.type = "validationSupplement";

        this.onError = function (error, element) {  // 'this' is the form element
            var container = $(this).find("[validation-for='" + escapeAttributeValue(element[0].name) + "']");
            if (container.length <= 0)
                return element.after(error);

            container.empty();
            container.removeClass("validation-message-valid").addClass("validation-message-error");

            element.data("validation-error-container", container);

            //var replace = $.parseJSON(container.attr("data-valmsg-replace")) !== false;
            //if (replace) {
            //    container.empty();
            //}
            //else {
            //}
            container.append(error);
        };

        this.onErrors = function (event, validator) {
            // 'this' is the form element
            //var container = $(this).find("[validation-summary=true]");

            var container = $("body").find("[validation-summary-for=" + $(this).attr("id") + "], validation-summary[for=" + $(this).attr("id") + "]");

            $.each($(this).find("validation-summary, [validation-summary]"), function (ix, it) {
                container.push(it);
            });
            $.each($(this).find("[data-valmsg-summary=true]"), function (ix, it) {
                container.push(it);
            });
            if (container.length <= 0)
                return;

            if (validator.errorList.length > 0) {
                container.removeClass("validation-summary-valid").addClass("validation-summary-errors");
                container.empty();

                var list = $('<ul>');
                $.each(validator.errorList, function (ix, it) {
                    var elementID = validator.idOrName(it.element);
                    var error = $("<" + validator.settings.errorElement + ">")
                        .attr("id", elementID + "-error")
                        .addClass(validator.settings.errorClass)
                        .html(it.message);

                    $("<li />").append(error).appendTo(list);
                });
                container.append(list);
            }
        };

        this.onSuccess = function (error, element) {  // 'this' is the form element
            var container = $(element).data("validation-error-container");
            if (!container)
                return;

            container.removeClass("validation-message-error").addClass("validation-message-valid");

            $(element).removeData("validation-error-container");

            //var replace = $.parseJSON(container.attr("data-valmsg-replace")) !== false;
            //if (replace) {
            //    container.empty();
            //}
            //else {
            //error.remove();
            //}
            container.empty();
        };

        this.onReset = function (event) {  // 'this' is the form element
            $(this).data("validator").resetForm();
            $("body").find("[validation-summary-for=" + $(this).attr("id") + "], validation-summary[for=" + $(this).attr("id") + "]").empty()
                .addClass("validation-summary-valid")
                .removeClass("validation-summary-errors");
            $(this).find(".validation-summary-errors").empty()
                .addClass("validation-summary-valid")
                .removeClass("validation-summary-errors");
            $(this).find(".validation-message-error").empty()
                .addClass("validation--messagevalid")
                .removeClass("validation-message-error")
                .removeData("validation-error-container")
                .find(">*")  // If we were using valmsg-replace, get the underlying error
                .removeData("validation-error-container");
        };

        function splitAndTrim(value) {
            return value.replace(/^\s+|\s+$/g, "").split(/\s*,\s*/g);
        }

        function escapeAttributeValue(value) {
            // As mentioned on http://api.jquery.com/category/selectors/
            return value.replace(/([!"#$%&'()*+,./:;<=>?@\[\\\]^`{|}~])/g, "\\$1");
        }

        function getModelPrefix(fieldName) {
            return fieldName.substr(0, fieldName.lastIndexOf(".") + 1);
        }

        function appendModelPrefix(value, prefix) {
            if (value.indexOf("*.") === 0) {
                value = value.replace("*.", prefix);
            }
            return value;
        }

        this.initialize();
    };

    ValidationSupplement.prototype.defaults = {
        validate: true,
        summary: 'multiline',
        //errorClass: "input-validation-error",
        //errorElement: "span",
        ignoreTitle: true
    };

    ValidationSupplement.prototype.initialize = function () {
        var that = this;
        var $element = $(this.element);

        $element
            .data('bs.' + that.type, this);

        $.validator.addMethod("__dummy__", function (value, element, param) {
            return true;
        });

        $.validator.addMethod("regex", function (value, element, param) {
            return this.optional(element) || new RegExp(param).test(value);
        });
    };

    ValidationSupplement.prototype.validate = function (_relatedTarget) {
        var that = this;
        var $element = $(this.element);
        var options = {
            //rules: {},
            //messages: {}
        };

        // Check if a validator for this form was already created
        var validator = $.data(this.element, "validator");
        if (validator) {
            return validator;
        }

        //$element.find(":input[data-val=true]").each(function () {
        $element.find(":input").each(function () {
            that.parseElement(this, that.validateAdapters, options);
        });

        $.extend(that.options,
            options,
            {
                errorPlacement: $.proxy(that.onError, $element),
                invalidHandler: $.proxy(that.onErrors, $element),
                reset: $.proxy(that.onReset, $element),
                success: $.proxy(that.onSuccess, $element)
            });

        $element.off("reset")
            .on("reset", that.options.reset);

        // options structure passed to jQuery Validate's validate() method
        validator = old.call($element, that.options);
        //$element.data("validate", false);

        return validator;
    };

    ValidationSupplement.prototype.parseElement = function (element, adapters, options) {
        var rules = {};
        var messages = {};

        var $form = $(element).parents("form")[0];
        if (!$form) {  // Cannot do client-side validation without a form
            return;
        }

        $.each($.validator.methods, function (key, value) {
            adapters[key] && adapters[key](element, rules, messages, key);
        });

        if (!$.isEmptyObject(rules)) {
            if (!options.rules || typeof options.rules != 'object') {
                options.rules = {};
            }
            if (!$.isEmptyObject(messages)) {
                if (!options.messages || typeof options.messages != 'object') {
                    options.messages = {};
                }
                options.messages[element.name] = messages;
            }
            options.rules[element.name] = rules;
        }
        $.extend(rules, { "__dummy__": true });
    };


    ValidationSupplement.prototype.validateAdapters = {

        // http://jqueryvalidation.org/required-method/
        required: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                rules[name] = true;
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/email-method/
        email: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = true;
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/url-method/
        url: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = true;
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/date-method/
        date: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = true;
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/dateISO-method/
        dateISO: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = $(element).attr(name);
            }

            var isData = typeof ($(element).data(prefix.toLowerCase()));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix.toLowerCase());
            }
        },

        // http://jqueryvalidation.org/number-method/
        number: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = true;
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/digits-method/
        digits: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = true;
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/minlength-method/
        minlength: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = parseFloat($(element).attr(name));
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/maxlength-method/
        maxlength: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = parseFloat($(element).attr(name));
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/rangelength-method/
        rangelength: function (element, rules, messages, name) {
            //var prefix = "val-" + 'length';
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                //rules[name] = [$(element).data(prefix + '-min') || 0, $(element).data(prefix + '-max') || 0];
                rules[name] = $(element).attr(name);
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/min-method/
        min: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = parseFloat($(element).attr(name));
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/max-method/
        max: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = parseFloat($(element).attr(name));
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/range-method/
        range: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                //rules[name] = [$(element).data(prefix + '-min') || 0, $(element).data(prefix + '-max') || 0];
                rules[name] = $(element).attr(name);
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/step-method/
        step: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = $(element).attr(name);
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/equalTo-method/
        equalTo: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                //rules[name] = ':input[name=' + $(element).data(prefix + '-other').replace(/([!"#$%&'()*+,./:;<=>?@\[\\\]^`{|}~])/g, "") + ']';
                rules[name] = $(element).attr(name);
            }

            var isData = typeof ($(element).data(prefix.toLowerCase()));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix.toLowerCase());
            }
        },

        //
        regex: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).attr(name));
            if (isAttr != "undefined") {
                rules[name] = $(element).attr(name);
            }

            var isData = typeof ($(element).data(prefix));
            if (isData != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                messages[name] = $(element).data(prefix);
            }
        },

        // http://jqueryvalidation.org/remote-method/
        remote: function (element, rules, messages, name) {
            //var prefix = "val-" + name;
            var prefix = name + "-msg";

            var isAttr = typeof ($(element).data(prefix));
            if (isAttr != "undefined") {  // Compare against undefined, because an empty message is legal (and falsy)
                var rule = {
                    url: $(element).data(prefix + '-url') || null,
                    type: $(element).data(prefix + '-type') || "GET",
                    data: {}
                };
                var additionalfields = $(element).data(prefix + '-additionalfields').replace(/([!"#$%&'()*+,./:;<=>?@\[\\\]^`{|}~])/g, "");
                //value.data[additionalfields] = $(element).val();

                rules[name] = rule;
                messages[name] = $(element).data(prefix);
            }
        }
    };

    // JQUERY VALIDATION PLUGIN DEFINITION
    // =========================

    function Plugin(options, _relatedTarget) {
        var validator;
        this.each(function () {
            var $this = $(this);
            var data = $this.data('bs.validationSupplement');
            var optionset = $.extend({}, ValidationSupplement.prototype.defaults, $this.data(), typeof options == 'object' && options);

            if (!data && /destroy|hide/.test(options)) return;
            if (!data) $this.data('bs.validationSupplement', (data = new ValidationSupplement(this, optionset)));

            if (typeof options == 'string') validator = data[options](_relatedTarget);
            else if (optionset.validate) validator = data.validate(_relatedTarget);
            //else data.hide(_relatedTarget);
        });
        return validator;
    }

    var old = $.fn.validate;

    $.fn.validate = Plugin;
    $.fn.validate.Constructor = ValidationSupplement;

    // JQUERY VALIDATION NO CONFLICT
    // ===================

    $.fn.validate.noConflict = function () {
        $.fn.validate = old;

        return this;
    };

}(jQuery);
