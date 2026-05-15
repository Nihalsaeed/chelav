package expo.modules.parsercore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import com.pennywiseai.parser.core.bank.BankParserFactory
import com.pennywiseai.parser.core.ParsedTransaction

class ParserCoreModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ParserCore")

        AsyncFunction("parseSms") { smsBody: String, sender: String, timestamp: Long, promise: Promise ->
            try {
                val parser = BankParserFactory.getParser(sender)
                if (parser == null) {
                    promise.resolve(null)
                    return@AsyncFunction
                }

                val result = parser.parse(smsBody, sender, timestamp)
                if (result == null) {
                    promise.resolve(null)
                    return@AsyncFunction
                }

                val map = hashMapOf<String, Any?>(
                    "amount" to result.amount.toPlainString(),
                    "type" to result.type.name,
                    "merchant" to result.merchant,
                    "reference" to result.reference,
                    "accountLast4" to result.accountLast4,
                    "balance" to result.balance?.toPlainString(),
                    "creditLimit" to result.creditLimit?.toPlainString(),
                    "smsBody" to result.smsBody,
                    "sender" to result.sender,
                    "timestamp" to result.timestamp,
                    "bankName" to result.bankName,
                    "transactionHash" to result.transactionHash,
                    "isFromCard" to result.isFromCard,
                    "currency" to result.currency,
                    "fromAccount" to result.fromAccount,
                    "toAccount" to result.toAccount
                )
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("PARSER_ERROR", "Failed to parse SMS: ${e.message}", e)
            }
        }

        Function("isKnownBankSender") { sender: String ->
            BankParserFactory.isKnownBankSender(sender)
        }

        Function("getAllSupportedBanks") {
            val parsers = BankParserFactory.getAllParsers()
            parsers.map { it.getBankName() }
        }

        AsyncFunction("generateTransactionId") { sender: String, amount: String, smsBody: String ->
            try {
                val normalizedAmount = java.math.BigDecimal(amount).setScale(2, java.math.RoundingMode.HALF_UP)
                val smsBodyHash = com.pennywiseai.parser.core.md5Hex(smsBody).take(16)
                val data = "$sender|$normalizedAmount|$smsBodyHash"
                com.pennywiseai.parser.core.md5Hex(data)
            } catch (e: Exception) {
                null
            }
        }
    }
}