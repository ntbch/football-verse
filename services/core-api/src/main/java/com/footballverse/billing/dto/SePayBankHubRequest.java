package com.footballverse.billing.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

import java.math.BigDecimal;

public record SePayBankHubRequest(
        String gateway,
        @JsonAlias("transactionDate")
        String transaction_date,
        @JsonAlias("accountNumber")
        String account_number,
        @JsonAlias("bankAccountXid")
        String bank_account_xid,
        @JsonAlias("subAccount")
        String va,
        @JsonAlias("code")
        String payment_code,
        String content,
        @JsonAlias("transferType")
        String transfer_type,
        @JsonAlias("transferAmount")
        BigDecimal amount,
        @JsonAlias("referenceCode")
        String reference_code,
        BigDecimal accumulated,
        @JsonAlias("id")
        String transaction_id
) {}
