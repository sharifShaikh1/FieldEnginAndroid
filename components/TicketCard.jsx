import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Text } from 'react-native-paper';

const TicketCard = ({ ticket, onAction, actionLabel, hasRequested }) => {
  const isClosed = ticket.status === 'Closed';
  const isPaid = ticket.paymentStatus === 'Paid';

  return (
    <Card style={{ marginBottom: 10, elevation: 2 }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title style={{ fontSize: 16, color: '#4F46E5' }}>{ticket.ticketId}</Title>
          <Title style={{ fontSize: 18, color: '#10B981' }}>₹{ticket.amount}</Title>
        </View>
        <Title style={{ fontSize: 18, marginTop: 5 }}>{ticket.companyName}</Title>
        <Paragraph style={{ color: '#6B7280' }}>{ticket.siteAddress}</Paragraph>
        <View style={{ borderBottomColor: '#E5E7EB', borderBottomWidth: 1, marginVertical: 10 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>Engineers Needed: {ticket.requiredEngineers}</Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>Accepted: {ticket.acceptedEngineersCount}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {ticket.expertiseRequired.map(exp => (
            <Text key={exp} style={{ fontSize: 12, backgroundColor: '#E5E7EB', color: '#374151', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15, marginTop: 5, marginRight: 5 }}>
              {exp}
            </Text>
          ))}
        </View>

        {/* Show payment status for closed tickets */}
        {isClosed && (
          <View style={{ marginTop: 10, padding: 8, borderRadius: 8, alignItems: 'center', backgroundColor: isPaid ? '#D1FAE5' : '#FEF3C7' }}>
            <Paragraph style={{ fontWeight: 'bold', color: isPaid ? '#065F46' : '#92400E' }}>
              Payment Status: {ticket.paymentStatus}
            </Paragraph>
          </View>
        )}

        {/* Button with dynamic state */}
        {onAction && (
          <TouchableOpacity
            onPress={onAction}
            disabled={hasRequested}
            style={{ backgroundColor: hasRequested ? '#D1D5DB' : '#4F46E5', marginTop: 15, padding: 12, borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>{hasRequested ? 'Access Requested' : actionLabel}</Text>
          </TouchableOpacity>
        )}
      </Card.Content>
    </Card>
  );
};

export default TicketCard;
