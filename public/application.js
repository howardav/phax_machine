var phaxMachine = {
	faxLogs: {
		render: function() {
			$.getJSON("/logs.json", {}, function(response, status, jqXHR) {
				if (response.success) {
					phaxMachine.createAlert("success", response.message)
					phaxMachine.faxLogs.populateFaxLogsTable(response.data)
					phaxMachine.faxLogs.makeRecipientsClickable()
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
				"id", "num_pages", "cost", "direction", "status", "type",
				"requested_at", "recipients"
			]

			faxesData.forEach(function(faxData) {
				faxData = phaxMachine.faxLogs.processFaxData(faxData)

				var tableRow = $("<tr></tr>")
				logAttributes.forEach(function(logAttribute) {
					var cell = $("<td></td>")
					cell.data("fax-attribute", logAttribute)
					cell.append(faxData[logAttribute])
					tableRow.append(cell)
				})
				tableRow.data("recipients", faxData.recipientsData)
				$("#fax-log-table").find("tbody").append(tableRow)
			})
		},

		makeRecipientsClickable: function() {
			var recipientCells = $("#fax-log-table").find("td").filter(function() {
				return $(this).data("fax-attribute") === "recipients"
			})
			recipientCells.each(function() {
				var recipientCountStr = $(this).text()
				if (recipientCountStr === '-') {
					return
				}

				recipientCount = parseInt(recipientCountStr)
				recipientsDataLink = $("<a href='#'>" + recipientCount + "</a>")
				recipientsDataLink.on("click", phaxMachine.faxLogs.displayRecipientsDataModal)
				$(this).html(recipientsDataLink)
			})
		},

		displayRecipientsDataModal: function() {
			var tableRow = $(this).closest("tr")
			var recipientsData = tableRow.data("recipients")
			var modal = $("#recipientsDataModal")
			var recipientAttributes = [
				"bitrate", "completed_at", "number", "resolution", "status"
			]
			var recipientsTable = $("#recipientsDataTable")

			recipientsTable.find("tbody").find("tr").remove()

			recipientsData.forEach(function(recipientData) {
				var recipientRow = $("<tr></tr>")
				var recipientData = phaxMachine.faxLogs.processRecipientData(recipientData)

				recipientAttributes.forEach(function(recipientAttribute) {
					var cell = $("<td>" + recipientData[recipientAttribute] + "</td>")
					recipientRow.append(cell)
				})

				recipientsTable.find("tbody").append(recipientRow)
			})
			modal.modal("show")
		},

		processRecipientData: function(recipientData) {
			return {
				"bitrate": recipientData.bitrate,
				"completed_at": phaxMachine.faxLogs.formatTimestamp(recipientData.completed_at),
				"number": recipientData.number,
				"resolution": recipientData.resolution,
				"status": phaxMachine.faxLogs.formatStatus(recipientData.status)
			}
		},

		processFaxData: function(faxData) {
			processedFaxData = {
				"id": faxData.id,
				"num_pages": faxData.num_pages,
				"cost": phaxMachine.faxLogs.formatMoney(faxData.cost),
				"direction": phaxMachine.faxLogs.capitalize(faxData.direction),
				"status": phaxMachine.faxLogs.formatStatus(faxData.status),
				"type": phaxMachine.faxLogs.formatType(faxData.is_test),
				"requested_at": phaxMachine.faxLogs.formatTimestamp(faxData.requested_at)
			}

			if (faxData.direction === 'sent') {
				processedFaxData.recipients = faxData.recipients.length
				processedFaxData.recipientsData = faxData.recipients
			}
			else {
				processedFaxData.recipients = '-'
			}

			return processedFaxData
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
			// Value must be converted to milliseconds
			return String(new Date(timeInSeconds * 1000))
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
									var percentStr = String(Math.floor(100 * (e.loaded / e.total)))
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

