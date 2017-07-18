var phaxMachine = {
	faxLogs: {
		render: function() {
			$.getJSON("/logs.json", {}, function(response, status, jqXHR) {
				if (response.success) {
					phaxMachine.createAlert("success", response.message)
					phaxMachine.faxLogs.populateFaxLogsTable(response.data)
				}
				else {
					phaxMachine.createAlert("danger", response.message)
				}

				phaxMachine.faxLogs.hideLoadingRow()
			})
		},

		hideLoadingRow: function() {
			$("#loading-row").hide()
		},

		populateFaxLogsTable: function(faxesData) {
			var logAttributes = [
				"id", "num_pages", "cost", "direction", "status", "",
				"requested_at", ""
			]

			faxesData.forEach(function(faxData) {
				faxData = phaxMachine.faxLogs.processFaxData(faxData)

				var tableRow = $("<tr></tr>")
				logAttributes.forEach(function(logAttribute) {
					var cell = $("<td></td>")
					cell.append(faxData[logAttribute])
					tableRow.append(cell)
				})
				$("#fax-log-table").find("tbody").append(tableRow)
			})
		},

		processFaxData: function(faxData) {
			return {
				"id": faxData.id,
				"num_pages": faxData.num_pages,
				"cost": phaxMachine.faxLogs.formatMoney(faxData.cost),
				"direction": phaxMachine.faxLogs.capitalize(faxData.direction),
				"status": phaxMachine.faxLogs.formatStatus(faxData.status),
				"type": phaxMachine.faxLogs.formatType(faxData.is_test),
				"requested_at": phaxMachine.faxLogs.formatTimestamp(faxData.requested_at),
				"recipients": ""
			}
		},

		formatMoney: function(valueInCents) {
			var valueString = String(valueInCents)
			while (valueString.length < 3)
				valueString = "0" + valueString
			var valueChars = valueString.split("")
			valueChars.splice(-2, 0, ".")
			return "$" + valueChars.join("")
		},

		capitalize: function(string) {
			chars = string.split('')
			chars[0] = chars[0].toUpperCase()
			return chars.join('')
		},

		formatStatus: function(statusStr) {
			var statusMap = {
				building:       ['Building',        'info'   ],
				pendingbatch:   ['Batching',        'info'   ],
				queued:         ['Queued',          'info'   ],
				inprogress:     ['In Progress',     'info'   ],
				ringing:        ['Ringing',         'info'   ],
				callactive:     ['Call Active',     'info'   ],
				success:        ['Success',         'success'],
				partialsuccess: ['Partial Success', 'warning'],
				willretry:      ['Will Retry',      'warning'],
				failure:        ['Failure',         'danger' ]
			}

			var [statusText, statusClass] = statusMap[statusStr]

			return "<span class='text-" + statusClass + "'>" + statusText + "</span>"
		},

		formatType: function(isTest) {
			if (isTest) {
				return 'Test'
			}
			else {
				return 'Live'
			}
		},

		formatTimestamp: function(timeInSeconds) {
			return String(new Date(timeInSeconds))
		}
	},

	sendFax: {
		render: function() {
			$("#sendFaxForm").on("submit", function(e) {
				$.ajax('/send', {
					type: 'POST',
					data: new FormData(this),
					cache: false,
					contentType: false,
					processData: false,
					xhr: function() {
						var jqXhr = $.ajaxSettings.xhr()

						if (jqXhr.upload) {
							jqXhr.upload.addEventListener('progress', function(e) {
								if (e.lengthComputable) {
									var percentStr = String(Math.floor(100 * (e.total / e.loaded)))
									$("#faxFileProgress").show().text(
										"Uploading file: " + percentStr + "%"
									)
								}
							},
							false)
						}

						return jqXhr
					}
				}).done(function(response, _textStatus, _jqXhr) {
					responseJson = JSON.parse(response)
					if (responseJson.success) {
						var message = "Fax #" + responseJson.faxId + " queued for sending."
						phaxMachine.createAlert("success", message)
					}
					else {
						phaxMachine.createAlert("danger", responseJson.message)
					}
				})

				e.preventDefault()
			})
		}
	},

	createAlert: function(type, message) {
		var alert = $("<div class='alert alert-dismissable alert-" + type + "'></div>")
		var closeAlertButton = $(
			'<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
			+ '<span aria-hidden="true">&times;</span>'
			+ '</button>'
		)
		alert.append(closeAlertButton)
		alert.append(message)
		$("#alerts").append(alert)
	}
}

$(document).ready(function() {
	pageScript = phaxMachine[$("main").attr("id")]
	if (pageScript != null) {
		pageScript.render()
	}
})
